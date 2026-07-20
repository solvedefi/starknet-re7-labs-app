import { NextResponse } from 'next/server';
import { LATEST_TNC_DOC_VERSION } from '@/constants';
import { db } from '@/db';
import { standariseAddress } from '@/utils';
import Mixpanel from 'mixpanel';
import { generateReferralCode } from '@/utils';

const mixpanel = Mixpanel.init('118f29da6a372f0ccb6f541079cad56b');

export async function POST(req: Request) {
  const { address, referrerAddress: _referrerAddress } = await req.json();

  if (!address) {
    return NextResponse.json({
      success: false,
      message: 'Address is required',
    });
  }

  let parsedAddress: string;
  try {
    parsedAddress = standariseAddress(address);
  } catch (e) {
    return NextResponse.json({
      success: false,
      message: 'Invalid address format',
    });
  }

  // Standardise referrer address if provided
  let referrerAddress: string | null = null;
  if (_referrerAddress) {
    try {
      referrerAddress = standariseAddress(_referrerAddress);
      // Prevent self-referral
      if (referrerAddress === parsedAddress) {
        referrerAddress = null;
      }
    } catch (e) {
      // Invalid referrer address, ignore it
      referrerAddress = null;
    }
  }

  try {
    // Check if user exists
    const existingUser = await db.user.findFirst({
      where: { address: parsedAddress },
    });

    let user;

    if (existingUser) {
      // User exists - update T&C acceptance
      user = await db.user.update({
        where: { address: parsedAddress },
        data: {
          isTncSigned: true,
          tncDocVersion: LATEST_TNC_DOC_VERSION,
        },
      });

      // Upsert the signature so re-accepting the same version is idempotent
      // and doesn't violate the (userId, tncDocVersion) unique constraint.
      await db.signatures.upsert({
        where: {
          unique_signature: {
            userId: existingUser.id,
            tncDocVersion: LATEST_TNC_DOC_VERSION,
          },
        },
        create: {
          userId: existingUser.id,
          signature: 'click-to-agree',
          tncDocVersion: LATEST_TNC_DOC_VERSION,
        },
        update: {},
      });

      mixpanel.track('TnC accepted', {
        address: parsedAddress,
        version: LATEST_TNC_DOC_VERSION,
        isNewUser: false,
      });
    } else {
      // New user - create with referral code and T&C accepted
      // Validate referrer exists if provided
      if (referrerAddress) {
        const referrer = await db.user.findFirst({
          where: { address: referrerAddress },
        });
        if (!referrer) {
          referrerAddress = null;
        }
      }

      // Generate unique referral code (retry if collision)
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.user.findFirst({
          where: { referralCode },
        });
        if (!existing) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      if (referrerAddress) {
        // Create user and update referrer in transaction
        const result = await db.$transaction([
          db.user.create({
            data: {
              address: parsedAddress,
              referralCode,
              isTncSigned: true,
              tncDocVersion: LATEST_TNC_DOC_VERSION,
              Signatures: {
                create: {
                  signature: 'click-to-agree',
                  tncDocVersion: LATEST_TNC_DOC_VERSION,
                },
              },
            },
          }),
          db.user.update({
            where: { address: referrerAddress },
            data: {
              referrals: {
                create: {
                  refreeAddress: parsedAddress,
                },
              },
              referralCount: { increment: 1 },
            },
          }),
        ]);
        user = result[0];
      } else {
        // Create user without referrer
        user = await db.user.create({
          data: {
            address: parsedAddress,
            referralCode,
            isTncSigned: true,
            tncDocVersion: LATEST_TNC_DOC_VERSION,
            Signatures: {
              create: {
                signature: 'click-to-agree',
                tncDocVersion: LATEST_TNC_DOC_VERSION,
              },
            },
          },
        });
      }

      mixpanel.track('TnC accepted', {
        address: parsedAddress,
        version: LATEST_TNC_DOC_VERSION,
        isNewUser: true,
        hasReferrer: !!referrerAddress,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'T&C accepted successfully',
      user: {
        address: user.address,
        referralCode: user.referralCode,
        isTncSigned: user.isTncSigned,
        tncDocVersion: user.tncDocVersion,
      },
    });
  } catch (error) {
    console.error('Error accepting T&C:', error);
    mixpanel.track('TnC acceptance error', {
      address: parsedAddress,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({
      success: false,
      message: 'Failed to accept T&C. Please try again.',
    });
  }
}

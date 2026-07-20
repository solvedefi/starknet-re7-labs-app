import NextLink from 'next/link';

// Mirrors the re7labs.xyz website footer: socials + documents.
const SOCIALS: { name: string; href: string }[] = [
  { name: 'Telegram', href: 'https://t.me/+gYiPKl2kghAwYWVk' },
  { name: 'LinkedIn', href: 'http://uk.linkedin.com/showcase/re7-labs' },
  { name: 'X.com', href: 'https://x.com/Re7Labs' },
];

const DOCUMENTS: { name: string; href: string }[] = [
  { name: 'Terms', href: '/terms' },
  { name: 'Privacy', href: 'https://www.re7labs.xyz/privacy' },
];

const linkClass = 'text-color2 transition-colors hover:text-white';

function FooterLink({ name, href }: { name: string; href: string }) {
  if (href.startsWith('/')) {
    return (
      <NextLink href={href} className={linkClass}>
        {name}
      </NextLink>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {name}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 w-full border-t border-white/10 px-6 py-8 md:px-10">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col-reverse items-center justify-between gap-6 lg:flex-row">
        <div className="text-sm text-color2">
          © {new Date().getFullYear()} Re7 Labs
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          {[...SOCIALS, ...DOCUMENTS].map((link) => (
            <FooterLink key={link.name} {...link} />
          ))}
        </div>
      </div>
    </footer>
  );
}

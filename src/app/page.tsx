'use client';

import Strategies from '@/components/Strategies';
import TVL from '@/components/TVL';
import arrow from '@public/arrow_left.png';

import {
  Container,
  Image,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import mixpanel from 'mixpanel-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const [tabIndex, setTabIndex] = useState(0);

  const searchParams = useSearchParams();
  const router = useRouter();

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
    },
    [Autoplay({ playOnInit: true, delay: 8000 })],
  );

  function setRoute(value: string) {
    router.push(`?tab=${value}`);
  }

  function handleTabsChange(index: number) {
    if (index === 0) {
      setRoute('strategies');
    } else {
      setRoute('pools');
    }
  }

  useEffect(() => {
    mixpanel.track('Page open');
  }, []);

  useEffect(() => {
    (async () => {
      const tab = searchParams.get('tab');
      if (tab === 'pools') {
        setTabIndex(1);
      } else {
        setTabIndex(0);
      }
    })();
  }, [searchParams]);

  return (
    <Container maxWidth={'1000px'} margin={'0 auto'}>
      <TVL />

      <Tabs
        position="relative"
        variant="unstyled"
        width={'100%'}
        index={tabIndex}
        onChange={handleTabsChange}
        marginTop={'10px'}
      >
        <TabList>
          <Tab
            color="light_grey"
            _selected={{ color: '#FFF' }}
            onClick={() => {
              mixpanel.track('Strategies opened');
            }}
          >
            <Container
              width="100%"
              display={'flex'}
              alignItems={'center'}
              padding={'8px 28px'}
            >
              <p>STRATEGIES</p>
              <Image
                src={arrow.src}
                alt="logo"
                height="13px"
                marginLeft={'30px'}
                marginBottom={'2px'}
              />
            </Container>
          </Tab>
        </TabList>
        <TabIndicator
          // mt="-1.5px"
          height="3px"
          bg="linear-gradient(to right, #2E45D0, #B1525C)"
          borderRadius="1px"
        />
        <TabPanels>
          <TabPanel bg="#171717" float={'left'} width={'100%'}>
            <Strategies />
          </TabPanel>
        </TabPanels>
      </Tabs>
      {/* <hr style={{width: '100%', borderColor: '#5f5f5f', float: 'left', margin: '20px 0'}}/> */}
    </Container>
  );
}

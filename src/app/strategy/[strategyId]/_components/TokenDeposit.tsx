import Deposit from '@/components/Deposit';
import Redeem from '@/components/Redeem';
import { StrategyInfo } from '@/store/strategies.atoms';
import {
  Alert,
  Card,
  Image,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import info from '@public/info.png';

interface TokenDepositProps {
  strategy: StrategyInfo<any>;
  isDualToken?: boolean;
}

export function TokenDeposit(props: TokenDepositProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const { strategy } = props;
  return (
    <Card width="100%" padding={'15px'} color="white" bg="#212121">
      <Tabs
        position="relative"
        variant="unstyled"
        width={'100%'}
        onChange={(index) => {
          setTabIndex(index);
        }}
      >
        <TabList>
          <Tab
            color="#5C5959"
            fontSize={'12px'}
            _selected={{ color: '#FFF' }}
            onClick={() => {
              // mixpanel.track('All pools clicked')
            }}
            paddingX={'0px'}
            marginX={'10px'}
          >
            <Text textAlign="center" width="100%">
              DEPOSIT
            </Text>
          </Tab>
          <Tab
            color="#5C5959"
            fontSize={'12px'}
            _selected={{ color: '#FFF' }}
            onClick={() => {
              // mixpanel.track('Strategies opened')
            }}
            paddingX={'0px'}
            marginX={'10px'}
          >
            <Text textAlign="center" width="100%">
              WITHDRAW
            </Text>
          </Tab>
        </TabList>
        <TabIndicator
          mt="-1.5px"
          height="2px"
          bg="linear-gradient(to right, #2E45D0, #B1525C)"
          color="#5C5959"
          borderRadius="1px"
        />
        <TabPanels>
          <TabPanel
            bg="#212121"
            float={'left'}
            width={'100%'}
            padding={'10px 0'}
            marginTop={'20px'}
          >
            {tabIndex == 0 && (
              <>
                <Deposit
                  strategy={strategy}
                  buttonText="Deposit"
                  callsInfo={strategy.depositMethods}
                  isDualToken={props.isDualToken || false}
                />
                {strategy.settings.alerts != undefined && (
                  <VStack>
                    {strategy.settings.alerts
                      .filter((a) => a.tab == 'deposit' || a.tab == 'all')
                      .map((alert, index) => (
                        <Alert
                          status={alert.type}
                          fontSize={'12px'}
                          color={'#8E8E8E'}
                          borderRadius={'10px'}
                          bg="#2D2D2D"
                          padding={'10px'}
                          key={index}
                        >
                          <Image
                            src={info.src}
                            alt="info icon"
                            width={'15px'}
                            height={'15px'}
                            marginRight={'15px'}
                          />
                          {alert.text}
                        </Alert>
                      ))}
                  </VStack>
                )}
              </>
            )}
          </TabPanel>
          <TabPanel
            bg="#212121"
            width={'100%'}
            float={'left'}
            padding={'10px 0'}
            marginTop={'20px'}
          >
            {tabIndex == 1 && (
              <>
                <Redeem
                  strategy={strategy}
                  buttonText="Redeem"
                  callsInfo={strategy.withdrawMethods}
                  isDualToken={props.isDualToken || false}
                />
                {strategy.settings.alerts != undefined && (
                  <VStack mt={'20px'}>
                    {strategy.settings.alerts
                      .filter((a) => a.tab == 'withdraw' || a.tab == 'all')
                      .map((alert, index) => (
                        <Alert
                          status={alert.type}
                          fontSize={'12px'}
                          color={'#8E8E8E'}
                          borderRadius={'10px'}
                          bg="#2D2D2D"
                          padding={'10px'}
                          key={index}
                        >
                          <Image
                            src={info.src}
                            alt="info icon"
                            width={'15px'}
                            height={'15px'}
                            marginRight={'15px'}
                          />
                          {alert.text}
                        </Alert>
                      ))}
                  </VStack>
                )}
              </>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Card>
  );
}

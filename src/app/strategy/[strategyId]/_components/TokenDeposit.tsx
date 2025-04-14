import Deposit from '@/components/Deposit';
import { StrategyInfo } from '@/store/strategies.atoms';
import {
  Alert,
  AlertIcon,
  Card,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';

interface TokenDepositProps {
  strategy: StrategyInfo<any>;
  isDualToken?: boolean;
}

export function TokenDeposit(props: TokenDepositProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const { strategy } = props;
  return (
    <Card width="100%" padding={'15px'} color="white" bg="highlight">
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
            color="light_grey"
            _selected={{ color: 'purple' }}
            onClick={() => {
              // mixpanel.track('All pools clicked')
            }}
          >
            Deposit
          </Tab>
          <Tab
            color="light_grey"
            _selected={{ color: 'purple' }}
            onClick={() => {
              // mixpanel.track('Strategies opened')
            }}
          >
            Withdraw
          </Tab>
        </TabList>
        <TabIndicator
          mt="-1.5px"
          height="2px"
          bg="purple"
          color="color1"
          borderRadius="1px"
        />
        <TabPanels>
          <TabPanel
            bg="highlight"
            float={'left'}
            width={'100%'}
            padding={'10px 0'}
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
                  <VStack mt={'20px'}>
                    {strategy.settings.alerts
                      .filter((a) => a.tab == 'deposit' || a.tab == 'all')
                      .map((alert, index) => (
                        <Alert
                          status={alert.type}
                          fontSize={'12px'}
                          color={'light_grey'}
                          borderRadius={'10px'}
                          bg="color2_50p"
                          padding={'10px'}
                          key={index}
                        >
                          <AlertIcon />
                          {alert.text}
                        </Alert>
                      ))}
                  </VStack>
                )}
              </>
            )}
          </TabPanel>
          <TabPanel
            bg="highlight"
            width={'100%'}
            float={'left'}
            padding={'10px 0'}
          >
            {tabIndex == 1 && (
              <>
                <Deposit
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
                          color={'light_grey'}
                          borderRadius={'10px'}
                          bg="color2_50p"
                          padding={'10px'}
                          key={index}
                        >
                          <AlertIcon />
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

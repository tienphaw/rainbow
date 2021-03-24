import { keys, times, toLower } from 'lodash';
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { FlatList, LayoutAnimation } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { emitAssetRequest, emitChartsRequest } from '../../redux/explorer';
import { fetchCoingeckoIds } from '../../redux/fallbackExplorer';
import { DefaultTokenLists } from '../../references';
import { ButtonPressAnimation } from '../animations';
import { AssetListItemSkeleton } from '../asset-list';
import { ListCoinRow } from '../coin-row';
import { initialChartExpandedStateSheetHeight } from '../expanded-state/ChartExpandedState';
import { Centered, Column, Flex, Row } from '../layout';
import { Emoji, Text } from '../text';
import EdgeFade from './EdgeFade';
import {
  useAccountAssets,
  useAccountSettings,
  useUserLists,
} from '@rainbow-me/hooks';
import { useNavigation } from '@rainbow-me/navigation';
import Routes from '@rainbow-me/routes';
import { ethereumUtils } from '@rainbow-me/utils';

const COINGECKO_TRENDING_ENDPOINT =
  'https://api.coingecko.com/api/v3/search/trending';

const fetchTrendingAddresses = async () => {
  const trendingAddresses = [];
  try {
    const coingeckoIds = await fetchCoingeckoIds();
    const request = await fetch(COINGECKO_TRENDING_ENDPOINT);
    const trending = await request.json();
    const idsToLookUp = trending.coins.map(coin => coin.item.id);
    keys(coingeckoIds).forEach(address => {
      if (idsToLookUp.indexOf(coingeckoIds[address]) !== -1) {
        trendingAddresses.push(address);
      }
    });
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return trendingAddresses;
};

const ListButton = styled(ButtonPressAnimation).attrs({
  scaleTo: 0.96,
})`
  margin-right: 16px;
  ${({ selected, theme: { colors } }) =>
    selected
      ? `
        background-color: ${colors.alpha(colors.blueGreyDark, 0.06)};
        border-radius: 12px;
        height: 30px;
        padding-horizontal: 8px;
        padding-top: ${ios ? 6 : 4}px;
      `
      : `
        padding-top: ${ios ? 6 : 4}px;
      `}
`;

const ListName = styled(Text)`
  margin-left: 3px;
  margin-top: ${ios ? -4.5 : 0}px;
`;

// Update trending lists every 5 minutes
const TRENDING_LIST_UPDATE_INTERVAL = 5 * 60 * 1000;

const layouts = [
  { length: 110, offset: 0 },
  { length: 89, offset: 110 },
  { length: 120, offset: 200 },
  { length: 81, offset: 320 },
  { length: 92, offset: 400 },
];
const getItemLayout = (_, index) => ({
  index,
  ...layouts[index],
});

export default function ListSection() {
  const dispatch = useDispatch();
  const { network, nativeCurrency } = useAccountSettings();
  const { navigate } = useNavigation();
  const {
    favorites,
    lists,
    updateList,
    ready,
    selectedList,
    setSelectedList,
    clearList,
  } = useUserLists();
  const listRef = useRef(null);
  const initialized = useRef(false);
  const { allAssets } = useAccountAssets();
  const { genericAssets } = useSelector(({ data: { genericAssets } }) => ({
    genericAssets,
  }));
  const { colors } = useTheme();
  const listData = useMemo(() => DefaultTokenLists[network], [network]);

  const addressSocket = useSelector(
    ({ explorer: { addressSocket } }) => addressSocket
  );
  useEffect(() => {
    if (addressSocket !== null) {
      Object.values(listData).forEach(({ tokens }) => {
        dispatch(emitAssetRequest(tokens));
        dispatch(emitChartsRequest(tokens));
      });
    }
  }, [addressSocket, dispatch, listData]);

  const trendingListHandler = useRef(null);

  const updateTrendingList = useCallback(async () => {
    const tokens = await fetchTrendingAddresses();
    clearList('trending');

    dispatch(emitAssetRequest(tokens));
    dispatch(emitChartsRequest(tokens));
    tokens.forEach(address => {
      updateList(address, 'trending', true);
    });

    trendingListHandler.current = setTimeout(
      () => updateTrendingList(),
      TRENDING_LIST_UPDATE_INTERVAL
    );
  }, [clearList, dispatch, updateList]);

  const handleSwitchList = useCallback(
    (id, index) => {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(200, 'easeInEaseOut', 'opacity')
      );
      setSelectedList(id);
      listRef.current?.scrollToIndex({
        animated: true,
        index,
        viewPosition: 0.5,
      });
    },
    [setSelectedList]
  );

  useEffect(() => {
    if (ready && !initialized.current) {
      ready && updateTrendingList();
      lists.forEach((list, index) => {
        if (list.id === selectedList) {
          setTimeout(() => {
            handleSwitchList(list.id, index);
          }, 300);
        }
      });
      initialized.current = true;
    }
    return () => {
      clearTimeout(trendingListHandler.current);
    };
  }, [
    ready,
    clearList,
    dispatch,
    updateList,
    updateTrendingList,
    lists,
    selectedList,
    handleSwitchList,
  ]);

  const listItems = useMemo(() => {
    if (selectedList === 'favorites') {
      return favorites.map(
        item =>
          ethereumUtils.getAsset(allAssets, toLower(item.address)) ||
          ethereumUtils.formatGenericAsset(
            genericAssets[toLower(item.address)],
            nativeCurrency
          )
      );
    } else {
      if (!lists?.length) return [];
      const currentList = lists.find(list => list.id === selectedList);
      if (!currentList) {
        return [];
      }

      return currentList.tokens.map(
        address =>
          ethereumUtils.getAsset(allAssets, toLower(address)) ||
          ethereumUtils.formatGenericAsset(
            genericAssets[toLower(address)],
            nativeCurrency
          )
      );
    }
  }, [
    allAssets,
    favorites,
    genericAssets,
    lists,
    nativeCurrency,
    selectedList,
  ]);

  const handlePress = useCallback(
    item => {
      navigate(
        ios ? Routes.EXPANDED_ASSET_SHEET : Routes.EXPANDED_ASSET_SCREEN,
        {
          asset: item,
          fromDiscover: true,
          longFormHeight: initialChartExpandedStateSheetHeight,
          type: 'token',
        }
      );
    },
    [navigate]
  );

  const itemProps = useMemo(
    () => ({
      showAddButton: true,
      showBalance: false,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item: list, index }) => (
      <ListButton
        key={`list-${list.id}`}
        onPress={() => handleSwitchList(list.id, index)}
        selected={selectedList === list.id}
      >
        <Row>
          <Emoji name={list.emoji} size="small" />
          <ListName
            color={
              selectedList === list.id
                ? colors.alpha(colors.blueGreyDark, 0.8)
                : colors.alpha(colors.blueGreyDark, 0.5)
            }
            lineHeight="paragraphSmall"
            size="lmedium"
            weight="bold"
          >
            {list.name}
          </ListName>
        </Row>
      </ListButton>
    ),
    [colors, handleSwitchList, selectedList]
  );

  return (
    <Column testID="lists-section">
      <Flex paddingHorizontal={19}>
        <Text size="larger" weight="heavy">
          Lists
        </Text>
      </Flex>

      <Fragment>
        <Column>
          <FlatList
            contentContainerStyle={{
              paddingBottom: 6,
              paddingHorizontal: 19,
              paddingTop: 10,
            }}
            data={listData}
            getItemLayout={getItemLayout}
            horizontal
            keyExtractor={item => item.id}
            ref={listRef}
            renderItem={renderItem}
            scrollsToTop={false}
            showsHorizontalScrollIndicator={false}
          />
          <EdgeFade />
        </Column>
        <Column>
          {!ready ? (
            times(2, index => (
              <AssetListItemSkeleton
                animated
                descendingOpacity
                key={`skeleton-pools-${index}`}
              />
            ))
          ) : listItems?.length ? (
            listItems
              .filter(item => {
                if (item.symbol && Number(item.price?.value) > 0) {
                  return true;
                }
                return false;
              })
              .map(item => (
                <ListCoinRow
                  {...itemProps}
                  item={item}
                  key={`${selectedList}-list-item-${item.address}`}
                  onPress={() => handlePress(item)}
                />
              ))
          ) : (
            <Centered marginVertical={42}>
              <Text
                color={colors.alpha(colors.blueGreyDark, 0.3)}
                size="large"
                weight="semibold"
              >
                This list is empty!
              </Text>
            </Centered>
          )}
        </Column>
      </Fragment>
    </Column>
  );
}

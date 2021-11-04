import { toLower } from 'lodash';
import React, { useMemo } from 'react';
import { ActivityIndicator, PixelRatio, StyleSheet, View } from 'react-native';
import styled from 'styled-components';
import { ENS_NFT_CONTRACT_ADDRESS } from '../../../references';
import { magicMemo } from '../../../utils';
import { getLowResUrl } from '../../../utils/getLowResUrl';
import { SimpleModelView } from '../../3d';
import { AudioPlayer } from '../../audio';
import { UniqueTokenImage } from '../../unique-token';
import { SimpleVideo } from '../../video';
import { ZoomableWrapper } from './ZoomableWrapper';
import isSupportedUriExtension from '@rainbow-me/helpers/isSupportedUriExtension';
import {
  useDimensions,
  usePersistentAspectRatio,
  useUniqueToken,
} from '@rainbow-me/hooks';
import { position } from '@rainbow-me/styles';

const pixelRatio = PixelRatio.get();

const GOOGLE_USER_CONTENT_URL = 'https://lh3.googleusercontent.com/';
const MAX_IMAGE_SCALE = 4;

const ModelView = styled(SimpleModelView)`
  ${position.size('100%')};
`;

const LoadingWrapper = styled(View)`
  align-items: flex-end;
  height: 100%;
  justify-content: flex-end;
  padding-bottom: 10;
  padding-right: 10;
  position: absolute;
`;

const UniqueTokenExpandedStateContent = ({
  animationProgress,
  asset,
  borderRadius,
  horizontalPadding = 24,
  resizeMode = 'cover',
  disablePreview,
  yPosition,
}) => {
  const { width: deviceWidth } = useDimensions();

  const maxImageWidth = deviceWidth - horizontalPadding * 2;
  const isENS =
    toLower(asset.asset_contract.address) === toLower(ENS_NFT_CONTRACT_ADDRESS);
  const isSVG = isSupportedUriExtension(asset.image_url, ['.svg']);
  const imageUrl = isSVG
    ? asset.image_preview_url
    : asset.image_url ||
      asset.image_original_url ||
      asset.image_preview_url ||
      asset.image_thumbnail_url;
  const size = deviceWidth * pixelRatio;
  const url = useMemo(() => {
    if (asset.image_url?.startsWith?.(GOOGLE_USER_CONTENT_URL) && size > 0) {
      return `${asset.image_url}=w${size * MAX_IMAGE_SCALE}`;
    }
    return asset.image_url;
  }, [asset.image_url, size]);

  const aspectRatio = usePersistentAspectRatio(asset.image_url);
  const aspectRatioWithFallback = aspectRatio.result || 1;

  const lowResUrl = isENS ? url : getLowResUrl(asset.image_url);
  const { supports3d, supportsVideo, supportsAudio } = useUniqueToken(asset);

  // default to showing a loading spinner for 3D/video assets
  const [loading, setLoading] = React.useState(supports3d || supportsVideo);

  return (
    <ZoomableWrapper
      animationProgress={animationProgress}
      aspectRatio={aspectRatioWithFallback}
      borderRadius={borderRadius}
      disableAnimations={disablePreview}
      horizontalPadding={horizontalPadding}
      isENS={isENS}
      yDisplacement={yPosition}
    >
      <View style={StyleSheet.absoluteFill}>
        {supportsVideo ? (
          <SimpleVideo
            loading={loading}
            posterUri={imageUrl}
            setLoading={setLoading}
            style={StyleSheet.absoluteFill}
            uri={asset.animation_url || imageUrl}
          />
        ) : supports3d ? (
          <ModelView
            fallbackUri={imageUrl}
            loading={loading}
            setLoading={setLoading}
            uri={asset.animation_url || imageUrl}
          />
        ) : supportsAudio ? (
          <AudioPlayer uri={asset.animation_url || imageUrl} />
        ) : (
          <UniqueTokenImage
            backgroundColor={asset.background}
            imageUrl={url}
            item={asset}
            lowResUrl={lowResUrl}
            resizeMode={resizeMode}
            size={maxImageWidth}
          />
        )}
        {!!loading && (
          <LoadingWrapper>
            <ActivityIndicator />
          </LoadingWrapper>
        )}
      </View>
    </ZoomableWrapper>
  );
};

export default magicMemo(UniqueTokenExpandedStateContent, 'asset.uniqueId');

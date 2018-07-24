import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Clipboard } from 'react-native';
import ToolTip from 'react-native-tooltip';
import { withNavigation } from 'react-navigation';
import { colors } from '../styles';

class CopyTooltip extends Component {
  static propTypes = {
    activeOpacity: PropTypes.number,
    navigation: PropTypes.object,
    textToCopy: PropTypes.string,
  }

  static defaultProps = {
    activeOpacity: 0.666,
  }

  tooltip = null

  componentDidUpdate = () => {
    if (this.props.navigation.state.isTransitioning) {
      this.handleHideTooltip();
    }
  }

  componentWillUnmount = () => this.handleHideTooltip()

  handleCopy = () => Clipboard.setString(this.props.textToCopy)
  handleHideTooltip = () => this.tooltip.hideMenu()
  handlePressIn = () => this.tooltip.showMenu()
  handleRef = (ref) => { this.tooltip = ref; }

  render = () => (
    <ToolTip
      {...this.props}
      actions={[{ onPress: this.handleCopy, text: 'Copy' }]}
      activeOpacity={this.props.activeOpacity}
      onPressIn={this.handlePressIn}
      ref={this.handleRef}
      underlayColor={colors.transparent}
    />
  )
}

export default withNavigation(CopyTooltip);

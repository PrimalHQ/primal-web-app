import { Component } from 'solid-js';
import Branding from '../../components/Branding/Branding';
import styles from './Settings.module.scss';

import Wormhole from '../../components/Wormhole/Wormhole';
import { useIntl } from '@cookbook/solid-intl';
import Search from '../../components/Search/Search';
import { settings as t } from '../../translations';
import { useSettingsContext } from '../../contexts/SettingsContext';
import PageCaption from '../../components/PageCaption/PageCaption';
import { Link, Outlet } from '@solidjs/router';
import HomeSidebar from '../../components/HomeSidebar/HomeSidebar';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import SettingsSidebar from '../../components/SettingsSidebar/SettingsSidebar';
import PageTitle from '../../components/PageTitle/PageTitle';

const Settings: Component = () => {

  const intl = useIntl();

  return (
    <div class={styles.settingsContainer}>
      <PageTitle title={intl.formatMessage(t.title)} />

      <Wormhole to="search_section">
        <Search />
      </Wormhole>

      <StickySidebar>
        <SettingsSidebar />
      </StickySidebar>

      <Outlet />
    </div>
  )
}

export default Settings;

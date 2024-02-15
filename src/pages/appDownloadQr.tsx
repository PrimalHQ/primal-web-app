import { isAndroid } from '@kobalte/utils';
import { Component, onMount } from 'solid-js';
import { isIOS } from '../components/BannerIOS/BannerIOS';
import { appStoreLink, playstoreLink } from '../constants';

const AppDownloadQr: Component = () => {

  onMount(() => {
    if (isIOS()) {
      window.location.replace(appStoreLink);
      return;
    }
    if (isAndroid()) {
      window.location.replace(playstoreLink);
      return;
    }

    window.location.replace('https://primal.net/home');
  })

  return (
    <>
    </>
  );
}

export default AppDownloadQr;

import { isAndroid } from '@kobalte/utils';
import { Component, onMount } from 'solid-js';
import { appStoreLink, playstoreLink } from '../constants';
import { isIOS } from '../utils';

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

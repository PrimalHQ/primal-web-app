import QRCodeStyling from 'qr-code-styling';
import { Component, createEffect, onMount } from 'solid-js';

import primalLogoFire from '../../assets/icons/logo_fire.svg'
import primalLogoIce from '../../assets/icons/logo_ice.svg'
import { useSettingsContext } from '../../contexts/SettingsContext';

import styles from './QrCode.module.scss';


const QrCode: Component<{ data: string }> = (props) => {
  let qrSlot: HTMLDivElement | undefined;

  const settings = useSettingsContext();

  const isIce = () => ['midnight', 'ice'].includes(settings?.theme || '');

  createEffect(() => {
    const qrCode = new QRCodeStyling({
      width: 280,
      height: 280,
      type: "svg",
      data: props.data,
      margin: 6,
      image: isIce() ? primalLogoIce : primalLogoFire,
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel :"Q",
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize:0.2,
        margin: 4,
      },
      dotsOptions:{
        type: "rounded",
        color: 'black',
      },
      cornersSquareOptions: {
        type: 'extra-rounded' ,
        color: 'black',
      },
      cornersDotOptions: {
        type: 'square',
        color: 'black',
      },
      backgroundOptions: {
        color: 'white',
      },
    });

    qrCode.append(qrSlot);
  });

  return (
    <div class={styles.container}>
      <div class={styles.frame}>
        <div id="qrSlot" ref={qrSlot}></div>
      </div>
    </div>
  );
}

export default QrCode;

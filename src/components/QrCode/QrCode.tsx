import QRCodeStyling from 'qr-code-styling';
import { Component, createEffect, createSignal, onMount } from 'solid-js';

import qrNostrich from '../../assets/icons/qr_nostrich.svg'
import qrLightning from '../../assets/icons/qr_lightning.svg';

import primalLogoFire from '../../assets/icons/primal_wave_fire.svg'
import primalLogoIce from '../../assets/icons/primal_wave_ice.svg'

import styles from './QrCode.module.scss';


const QrCode: Component<{
  data: string,
  ecl?: 'L' | 'M' | 'Q' | 'H',
  image?: string,
  imageSize?: number,
  type?: string,
}> = (props) => {
  let qrSlot: HTMLDivElement | undefined;

  const qrTypes = ['nostr', 'lightning'];

  const qrType = () => {
    const t = props.type && qrTypes.includes(props.type) ?
      props.type :
      'none';

    const qrImages: Record<string, string | undefined> = {
      nostr: qrNostrich,
      lightning: qrLightning,
      none: undefined,
    }

    return qrImages[t];
  };

  createEffect(() => {
    const qrCode = new QRCodeStyling({
      width: 280,
      height: 280,
      type: "svg",
      data: props.data,
      margin: 1,
      image: qrType(),
      qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel :"Q",
      },
      imageOptions: {
        hideBackgroundDots: false,
        imageSize:0.2,
        margin: 0,
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

  // const [storedData, setStoredData] = createSignal('');

  // const errorCorrectionLevel = () => props.ecl || 'M';

  // const image = () => {
  //   if (props.image) return props.image;

  //   return isIce() ? primalLogoIce : primalLogoFire;
  // }

  // const imageSize = () => props.imageSize || 0.6;

  // createEffect(() => {
  //   const data = props.data;

  //   if(!qrSlot) return;

  //   if (data !== storedData()) {
  //     qrSlot.innerHTML = '';

  //     const qrCode = new QRCodeStyling({
  //       width: 280,
  //       height: 280,
  //       type: "svg",
  //       data: data,
  //       margin: 0,
  //       image: image(),
  //       qrOptions: {
  //         typeNumber: 0,
  //         mode: "Byte",
  //         errorCorrectionLevel: errorCorrectionLevel(),
  //       },
  //       imageOptions: {
  //         hideBackgroundDots: false,
  //         imageSize: imageSize(),
  //         margin: 4,
  //       },
  //       dotsOptions:{
  //         type: "rounded",
  //         color: 'black',
  //       },
  //       cornersSquareOptions: {
  //         type: 'extra-rounded' ,
  //         color: 'black',
  //       },
  //       cornersDotOptions: {
  //         type: 'square',
  //         color: 'black',
  //       },
  //       backgroundOptions: {
  //         color: 'white',
  //       },
  //     });

  //     qrCode.append(qrSlot);

  //     setStoredData(() =>  data);
  //   }
  // });

  return (
    <div class={styles.container}>
      <div class={styles.frame}>
        <div id="qrSlot" ref={qrSlot}></div>
      </div>
    </div>
  );
}

export default QrCode;

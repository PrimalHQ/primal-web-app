import QRCodeStyling from 'qr-code-styling';
import { Component, createEffect } from 'solid-js';

import qrNostrich from '../../assets/icons/qr_nostrich.svg'
import qrLightning from '../../assets/icons/qr_lightning.svg'

import styles from './QrCode.module.scss';


const QrCode: Component<{ data: string, type?: string }> = (props) => {
  let qrSlot: HTMLDivElement | undefined;

  const qrTypes = ['nostr', 'lightning'];

  const qrType = () => {
    const t = props.type && qrTypes.includes(props.type) ?
      props.type :
      'nostr';

    const qrImages: Record<string, string> = {
      nostr: qrNostrich,
      lightning: qrLightning,
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

  return (
    <div class={styles.container}>
      <div class={styles.frame}>
        <div id="qrSlot" ref={qrSlot}></div>
      </div>
    </div>
  );
}

export default QrCode;

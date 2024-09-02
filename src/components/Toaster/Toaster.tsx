import styles from  "./Toaster.module.scss";

import { Component, createContext, JSX, useContext } from "solid-js";
import DOMPurify from "dompurify";

type ContextProps = { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; };

type ToastContextStore = {
  sendWarning: (message: string) => void,
  sendSuccess: (message: string) => void,
  sendInfo: (message: string) => void,
  notImplemented: () => void,
}

const ToastContext = createContext<ToastContextStore>();

const Toaster: Component<ContextProps> = (props) => {
  let toastHolder: HTMLDivElement | undefined = undefined;

  const toastMesage = (message: string, klass: string, duration = 4000) => {
    const toaster = document.createElement('div');
    toaster.innerHTML = DOMPurify.sanitize(message);
    toaster.classList.add(klass);
    setTimeout(() => {
      toastHolder?.append(toaster)
    }, 0);

    setTimeout(() => {
      toastHolder?.removeChild(toaster);
    }, duration);

  };

  const toastData = {
    sendWarning: (message: string) => {
      toastMesage(message, styles.toastWarning);
    },
    sendSuccess: (message: string) => {
      toastMesage(message, styles.toastSuccess, 2000);
    },
    sendInfo: (message: string) => {
      toastMesage(message, styles.toastInfo);
    },
    notImplemented: () => {
      toastMesage(
        'Feature not available in this preview release. Rest assured, we are working on it. Come back soon!',
        styles.toastInfo,
        2000,
      );
    },
  };

  return (
    <>
      <div
        ref={toastHolder}
        class={styles.toastHolder}
      >
      </div>
      <ToastContext.Provider value={toastData}>
        {props.children}
      </ToastContext.Provider>
    </>
  )
}

export default Toaster;

export function useToastContext() { return useContext(ToastContext); }

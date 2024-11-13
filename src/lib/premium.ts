import { Kind } from "../constants";
import { subTo } from "../sockets";
import { signEvent } from "./nostrAPI";

export const sendPremiumNameCheck = (name: string, pubkey: string | undefined, subId: string, socket: WebSocket) => {
  let payload = { name };

  if (pubkey) {
    // @ts-ignore
    payload.pubkey = pubkey;
  }

  const message = JSON.stringify([
    "REQ",
    subId,
    {cache: ["membership_name_available", { ...payload  }]},
  ]);

  if (socket) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
}

export const changePremiumName = async (name: string, subId: string, socket: WebSocket) => {

  const event = {
    kind: Kind.Settings,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      name,
    }),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_change_name", { event_from_user: signedNote  }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }

    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
}

export const getPremiumQRCode = async (pubkey: string | undefined, name: string, productId: string, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      name,
      product_id: productId,
      receiver_pubkey: pubkey,
    }),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_purchase_product", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
}

export const startListeningForPremiumPurchase = (membershipId: string, subId: string, socket: WebSocket) => {
  const message = JSON.stringify([
    "REQ",
    subId,
    {cache: ["membership_purchase_monitor", { membership_quote_id: membershipId }]},
  ]);

  if (socket) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
};

export const stopListeningForPremiumPurchase = (subId: string, socket: WebSocket) => {
  const message = JSON.stringify([
    "CLOSE",
    subId,
  ]);

  if (socket && socket.readyState === WebSocket.OPEN) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
};


export const getLegendQRCode = async (pubkey: string | undefined, name: string, amount_usd: number, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({
      name,
      product_id: 'legend-premium',
      receiver_pubkey: pubkey,
      amount_usd: `${amount_usd}`,
    }),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_purchase_product", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
}

export const startListeningForLegendPurchase = (membershipId: string, subId: string, socket: WebSocket) => {
  const message = JSON.stringify([
    "REQ",
    subId,
    {cache: ["membership_purchase_monitor", { membership_quote_id: membershipId }]},
  ]);

  if (socket) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
};

export const stopListeningForLegendPurchase = (subId: string, socket: WebSocket) => {
  const message = JSON.stringify([
    "CLOSE",
    subId,
  ]);

  if (socket && socket.readyState === WebSocket.OPEN) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
};


export const getPremiumStatus = async (pubkey: string | undefined, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: JSON.stringify({}),
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_status", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to upload: ', reason);
    return false;
  }
}



export const getPremiumMediaStats = async (pubkey: string | undefined, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: `{ "description": "get media stats'"}`,
  };

  try {
    const signedNote = await signEvent(event);

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_media_management_stats", { event_from_user: signedNote }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to fetch media stats: ', reason);
    return false;
  }
}

export const getPremiumMediaList = async (pubkey: string | undefined, until: number, offset: number, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: `{ "description": "get media list'"}`,
  };

  try {
    const signedNote = await signEvent(event);

    let payload = {
      event_from_user: signedNote,
      limit: 20,
    }

    if (until > 0) {
      // @ts-ignore
      payload.until = until
    }

    if (offset > 0) {
      // @ts-ignore
      payload.offset = offset;
    }

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_media_management_uploads", { ...payload }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to fetch media list: ', reason);
    return false;
  }
}

export const deletePremiumMedia = async (pubkey: string | undefined, url: string, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: `{ "url": "${url}"}`,
  };

  try {
    const signedNote = await signEvent(event);

    let payload = {
      event_from_user: signedNote,
    }

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_media_management_delete", { ...payload }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to delete media: ', reason);
    return false;
  }
}

export const getContactListHistory = async (pubkey: string | undefined, until: number, offset: number, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: `{ "description": "get contacts history list'"}`,
  };

  try {
    const signedNote = await signEvent(event);

    let payload = {
      event_from_user: signedNote,
      limit: 30,
    }

    if (until > 0) {
      // @ts-ignore
      payload.until = until
    }

    if (offset > 0) {
      // @ts-ignore
      payload.offset = offset;
    }

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_recovery_contact_lists", { ...payload }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to fetch media list: ', reason);
    return false;
  }
}

export const getContentListHistory = async (pubkey: string | undefined, subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: `{ "description": "get content list'"}`,
  };

  try {
    const signedNote = await signEvent(event);

    let payload = {
      event_from_user: signedNote,
    }

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_content_stats", { ...payload }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to fetch content list: ', reason);
    return false;
  }
}

export const getContentDownloadData = async (pubkey: string | undefined, kinds: number[], subId: string, socket: WebSocket) => {
  if (!pubkey) return;

  const event = {
    kind: Kind.Settings,
    tags: [['p', pubkey]],
    created_at: Math.floor((new Date()).getTime() / 1000),
    content: `{ "description": "get content download data'"}`,
  };

  try {
    const signedNote = await signEvent(event);

    let payload = {
      event_from_user: signedNote,
    }

    if (kinds.length > 0) {
      // @ts-ignore
      payload.kinds = [...kinds]
    }

    const message = JSON.stringify([
      "REQ",
      subId,
      {cache: ["membership_content_backup", { ...payload }]},
    ]);

    if (socket) {
      const e = new CustomEvent('send', { detail: { message, ws: socket }});

      socket.send(message);
      socket.dispatchEvent(e);
    } else {
      throw('no_socket');
    }


    return true;
  } catch (reason) {
    console.error('Failed to fetch content download list: ', reason);
    return false;
  }
}

export const isPremiumNameAvailable = (name: string, pubkey: string | undefined, socket: WebSocket | undefined, subId: string) => {
  return new Promise<boolean>((resolve, reject) => {
    if (!socket) {
      resolve(false);
      return;
    }

    let nameAvailable = false;

    const unsub = subTo(socket, subId, (type, _, content) => {
      if (type === 'EVENT') {
        const response: { available: boolean } = JSON.parse(content?.content || '{ "available": false}');

        nameAvailable = response.available || false;
      }

      if (type === 'NOTICE') {
        unsub();
        reject(content?.content)
      }

      if (type === 'EOSE') {
        unsub();

        resolve(nameAvailable);

        // if (premiumData.nameAvailable) {
        //   if (rename) {
        //     changePrimalName();
        //   }
        //   else {
        //     navigate('/premium/overview');
        //   }
        // } else {
        //   setPremiumData('errorMessage', () => intl.formatMessage(t.errors.nameUnavailable));
        // }
      }
    });

    sendPremiumNameCheck(name, pubkey, subId, socket);

  })
};


export const fetchExchangeRate = (subId: string, socket: WebSocket, target_currency = 'USD') => {
  const message = JSON.stringify([
    "REQ",
    subId,
    {cache: ["membership_exchange_rate", { target_currency }]},
  ]);

  if (socket) {
    const e = new CustomEvent('send', { detail: { message, ws: socket }});

    socket.send(message);
    socket.dispatchEvent(e);
  } else {
    throw('no_socket');
  }
};

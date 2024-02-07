import { sendMessage } from "../sockets"

export const getMobileReleases = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_app_releases"]},
  ]))
}

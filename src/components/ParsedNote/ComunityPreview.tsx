import LinkPreview from "../LinkPreview/LinkPreview";

export default function ComunityPreview(props: any) {
  return <LinkPreview
  preview={props.preview}
  bordered={props.isEmbeded}
  isLast={props.index === props.content.length-1}
/>;
}

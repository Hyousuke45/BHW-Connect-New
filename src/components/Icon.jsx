// SVG icon set — each entry is the inner path markup of a 24x24 viewBox icon
const ICONS = {
  dash: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>',
  home: '<path d="M12 3l9 8h-3v9h-5v-6H9v6H4v-9H1l11-8z" fill="currentColor"/>',
  bell: '<path d="M12 22a2.3 2.3 0 0 0 2.3-2.3H9.7A2.3 2.3 0 0 0 12 22zm7-5.5v-5.9c0-3-1.6-5.5-4.4-6.2v-.8a2.6 2.6 0 1 0-5.2 0v.8C6.6 6.1 5 8.6 5 11.6v5.9L3 19.5v.7h18v-.7l-2-2z" fill="currentColor"/>',
  user: '<path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2.5c-4.4 0-8.5 2.2-8.5 6.5V23h17v-2c0-4.3-4.1-6.5-8.5-6.5z" fill="currentColor"/>',
  users: '<path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 1a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 8 12zm0 2c-2.7 0-6 1.3-6 4v3h7v-3a6 6 0 0 1 1.6-4A7.8 7.8 0 0 0 8 14zm8 0a7.8 7.8 0 0 0-2.6.4A6 6 0 0 1 15 18v3h7v-3c0-2.7-3.3-4-6-4z" fill="currentColor"/>',
  heart: '<path d="M12 21.3 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1A6 6 0 0 1 16.5 3C19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5l-1.4 1.3z" fill="currentColor"/>',
  baby: '<path d="M12 2a7 7 0 0 0-7 7v1.1A4.5 4.5 0 0 0 5 19h7a5 5 0 0 0 5-5V9a5 5 0 0 0-5-7zm-3 5.5A1.5 1.5 0 1 1 10.5 6 1.5 1.5 0 0 1 9 7.5zm6 0A1.5 1.5 0 1 1 16.5 6 1.5 1.5 0 0 1 15 7.5z" fill="currentColor"/>',
  preg: '<path d="M9 2a3 3 0 0 1 3 3v1h1.5a4.5 4.5 0 0 1 4.5 4.5V15a7 7 0 0 1-7 7H6a2 2 0 0 1-2-2v-6.5A5.5 5.5 0 0 1 9.5 6V5a3 3 0 0 1 3-3H9z" fill="currentColor"/><circle cx="9.5" cy="12.5" r="1.6" fill="currentColor"/>',
  syringe: '<path d="M21 3l-1.5-1.5-2.1 2.1-1.4-1.4-1.4 1.4 1.4 1.4-9.8 9.8-1.1-1.1a1 1 0 0 0-1.4 1.4l4.2 4.2a1 1 0 0 0 1.4-1.4l-1.1-1.1 9.8-9.8 1.4 1.4L21 8.7l1.4-1.4-1.4-1.4L22.5 4 21 2.5V3z" fill="currentColor"/>',
  pill: '<path d="M6.5 2A4.5 4.5 0 0 0 2 6.5v11A4.5 4.5 0 0 0 6.5 22h11a4.5 4.5 0 0 0 0-9h-6A4.5 4.5 0 0 0 6.5 2z" fill="currentColor"/>',
  cal: '<path d="M7 2v2h10V2h2v2h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V2h2zM4 9v11h16V9H4zm3 2h3v3H7v-3z" fill="currentColor"/>',
  calcheck: '<path d="M7 2v2h10V2h2v2h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V2h2zM4 9v11h16V9H4zm11.6 2.2 1.4 1.4-4.9 4.9-3-3 1.4-1.4 1.6 1.6 3.5-3.5z" fill="currentColor"/>',
  clk: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.3 2.6-.6 1.4z" fill="currentColor"/>',
  search: '<path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" fill="currentColor"/>',
  plus: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" fill="currentColor"/>',
  save: '<path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-8V5l4 4h-4a1 1 0 0 1-1-1z" fill="currentColor"/>',
  edit: '<path d="M3 17.2V21h3.8L17.9 9.9l-3.8-3.8L3 17.2zM20.7 7.1a1 1 0 0 0 0-1.4l-2.4-2.4a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8 1.8-1.8z" fill="currentColor"/>',
  trash: '<path d="M6 7h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-4h6l1 2h4v2H4V5h4l1-2z" fill="currentColor"/>',
  eye: '<path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="currentColor"/>',
  eyeoff: '<path d="M2.1 3.5 3.5 2.1l18.4 18.4-1.4 1.4-3.2-3.2A12.6 12.6 0 0 1 12 19.5C7 19.5 2.7 16.4 1 12a12.9 12.9 0 0 1 4.1-5.3L2.1 3.5zM12 4.5c5 0 9.3 3.1 11 7.5a13 13 0 0 1-3.7 4.9l-2.3-2.3A5 5 0 0 1 8.4 6.3L6.6 4.5A12.4 12.4 0 0 1 12 4.5zm-3.5 8A3.5 3.5 0 0 0 12 16.5l-3.5-4z" fill="currentColor"/>',
  refresh: '<path d="M17.6 6.4A8 8 0 1 0 19.7 14h-2.1a6 6 0 1 1-1.8-5.2L13 11h7V4l-2.4 2.4z" fill="currentColor"/>',
  export: '<path d="M12 3l5 5-1.4 1.4L13 6.8V16h-2V6.8L8.4 9.4 7 8l5-5zM5 18h14v2H5v-2z" fill="currentColor"/>',
  filter: '<path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" fill="currentColor"/>',
  check: '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>',
  x: '<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4L10.6 12 4.3 5.7l1.4-1.4L12 10.6l6.3-6.3 1.4 1.4z" fill="currentColor"/>',
  chevL: '<path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12l4.6-4.6z" fill="currentColor"/>',
  chevR: '<path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4L13.2 12l-4.6 4.6z" fill="currentColor"/>',
  chevD: '<path d="M7.4 8.6 6 10l6 6 6-6-1.4-1.4L12 13.2 7.4 8.6z" fill="currentColor"/>',
  logout: '<path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6v-2h6V5h-6V3z" fill="currentColor"/><path d="M17 9H8v4h9V9z" fill="currentColor"/><path d="M5 7h2v10H5z" fill="currentColor"/>',
  lock: '<path d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2zM9 7a3 3 0 0 1 6 0v2H9V7zm4 8.7V18h-2v-3.3a2 2 0 1 1 2 0z" fill="currentColor"/>',
  info: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>',
  warn: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>',
  okc: '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-1.2 14.6L6.7 12.5l1.4-1.4 2.7 2.7 5.8-5.8 1.4 1.4-7.2 7.2z" fill="currentColor"/>',
  list: '<path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z" fill="currentColor"/>',
  sheet: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 6h-7v4h7v4h-7v4H9v-4H5v-4h4V9H5V5h4v4h4V5h6v4z" fill="currentColor"/>',
  star: '<path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2z" fill="currentColor"/>',
  map: '<path d="M9 3 3 5.5v16L9 19l6 2 6-2.5v-16L15 5 9 3zm0 2.2 6 2v13.6l-6-2V5.2z" fill="currentColor"/>',
  key: '<path d="M12.6 2.5a6.5 6.5 0 0 0-6.4 8L2 14.9V19h4.1l1.1-1.1v-2h2v-2h2l1.5-1.5a6.5 6.5 0 1 0 0-9.9zM15 5.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z" fill="currentColor"/>',
  health: '<path d="M19 3h-4v2h-2v2h-2V5H9V3H5a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-6 6v2h-2V9h2zm0 4v2h-2v-2h2zm-3-2H8v-2h2v2zm6 0h-2V9h2v2z" fill="currentColor"/>',
  activity: '<path d="M3 13h3l3-9 4 16 3-7h5v2h-3.8L13 22 9 7l-2.2 6H3v-2z" fill="currentColor"/>',
  chart: '<path d="M4 20h16v2H2V2h2v18zm3-6h2v6H7v-6zm5-9h2v15h-2V5zm5 4h2v11h-2V9z" fill="currentColor"/>',
  menu: '<path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z" fill="currentColor"/>',
  flask: '<path d="M9 2v6.5L3.5 18A3 3 0 0 0 6 22h12a3 3 0 0 0 2.5-4L15 8.5V2H9zm2 2h2v5l3 6H8l3-6V4z" fill="currentColor"/>',
  report: '<path d="M5 2h11l5 5v15H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm10 2v4h4l-4-4zM8 10h8v2H8v-2zm0 4h8v2H8v-2z" fill="currentColor"/>',
  adduser: '<path d="M15 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-9-2a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.7 0-6 1.3-6 4v3h7v-3a7 7 0 0 1 1-3.5A9.3 9.3 0 0 0 6 12zm9 0c-.7 0-1.6.1-2.4.3A6.9 6.9 0 0 1 14 16v3h8v-3c0-2.7-3.3-4-7-4z" fill="currentColor"/>',
  clipboard: '<path d="M9 2h6a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V3a1 1 0 0 1 1-1zm1 3v1h4V3h-4v2zm0 6h6v2h-6v-2zm0 4h6v2h-6v-2zm0 4h4v2h-4v-2z" fill="currentColor"/>',
  history: '<path d="M13 3a9 9 0 0 0-9 9H1.8L5 15.5 8.2 12H6a7 7 0 1 1 2.1 5l1.5 1.5A9 9 0 1 0 13 3zm-1 5v5l4.2 2.5.8-1.3-3.5-2.1V8H12z" fill="currentColor"/>',
  camera2: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8-3h-3.2l-1.4-2H8.6L7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" fill="currentColor"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" fill="currentColor"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 7L4.2 6v12h15.6V6L12 11zm0-2 7-4.5H5L12 9z" fill="currentColor"/>',
  phone: '<path d="M6.6 2.9a1.7 1.7 0 0 0-2.4 0L2.6 4.5a2.3 2.3 0 0 0-.5 2.6 17.2 17.2 0 0 0 8.8 8.8 2.3 2.3 0 0 0 2.6-.5l1.6-1.6a1.7 1.7 0 0 0 0-2.4l-2.1-2.1a1.7 1.7 0 0 0-1.9-.3l-1.3.6a11.5 11.5 0 0 1-2.4-2.4l.6-1.3a1.7 1.7 0 0 0-.3-1.9L6.6 2.9z" fill="currentColor"/>',
}

export default function Icon({ name, style, className }) {
  const markup = ICONS[name]
  if (!markup) return null
  return (
    <svg
      viewBox="0 0 24 24"
      className={'ico' + (className ? ' ' + className : '')}
      style={style}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

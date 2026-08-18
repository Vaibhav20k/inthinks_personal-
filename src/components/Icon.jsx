const paths = {
  inbox: 'M4 13h4l2 3h4l2-3h4M4 13l2.5-7h11L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z',
  graph: 'M6 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-1.4 1.6L7.4 14.4m6-4.8 3.2 4.8',
  layers: 'm12 3 8 4.5-8 4.5-8-4.5L12 3Zm8 9-8 4.5L4 12m16 4.5L12 21l-8-4.5',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10 8v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  export: 'M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  check: 'm5 12.5 4.5 4.5L19 7',
  arrow: 'M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
}

export default function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  )
}

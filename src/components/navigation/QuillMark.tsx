/** The Creatura mark: a quill nib drawn as a single stroke. */
export function QuillMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 20c3.8-1 5.9-2.9 7.4-5.4" />
      <path d="M20 4c-1.3 6.9-4.8 10.4-9.8 11-1.3.2-2.2-.2-2.6-1-.5-1 0-2.3 1-3.1C11.3 8.7 15.5 7.9 20 4Z" />
      <path d="M13.5 10.5 20 4" opacity="0.45" />
    </svg>
  );
}

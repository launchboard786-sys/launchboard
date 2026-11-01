/** Every page enters with a short lift-and-fade, in CSS, so it starts as soon as the HTML arrives. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

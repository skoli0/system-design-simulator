/** Inline script to apply theme before React hydrates — prevents flash. */
export function ThemeScript() {
  const script = `(function(){try{var r=localStorage.getItem("systemsim-app");if(!r){document.documentElement.classList.remove("dark");return;}var s=JSON.parse(r);var t=(s.state&&s.state.theme)||"light";document.documentElement.classList.toggle("dark",t==="dark");}catch(e){document.documentElement.classList.remove("dark");}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

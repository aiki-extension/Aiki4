import Popup from "./Pages/Popup.svelte";
import Settings from "./Pages/Settings.svelte";
import { getTheme, drawTheme } from "./util/themes";

const app = async () => {
  await drawTheme();

  const page = new URLSearchParams(window.location.search).get("page");

  if (page === "settings") {
    return new Settings({ target: document.body });
  } else {
    return new Popup({ target: document.body });
  }
};

export default app();

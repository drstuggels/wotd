import type { EditPage, SettingsPage, View } from "./types";

export type RouteState = {
  editPage: EditPage;
  settingsPage: SettingsPage;
  view: View;
};

export function getRouteState() {
  const params = new URLSearchParams(window.location.search);
  const routeView = params.get("view");
  const routeEditPage = params.get("edit");
  const routeSettingsPage = params.get("settings");
  const editPage: EditPage = routeEditPage === "bulk" ? "bulk" : "words";
  const settingsPage: SettingsPage =
    routeSettingsPage === "synonyms" || routeSettingsPage === "backup"
      ? routeSettingsPage
      : "data";
  const inferredView: View = routeEditPage
    ? "edit"
    : routeSettingsPage
      ? "settings"
      : "practice";
  const view: View =
    routeView === "edit" || routeView === "settings" || routeView === "practice"
      ? routeView
      : inferredView;

  return {
    editPage,
    settingsPage,
    view,
  };
}

export function routeUrl({ editPage, settingsPage, view }: RouteState) {
  const params = new URLSearchParams(window.location.search);
  params.delete("view");
  params.delete("edit");
  params.delete("settings");

  if (view !== "practice") {
    params.set("view", view);
  }

  if (view === "edit" && editPage !== "words") {
    params.set("edit", editPage);
  }

  if (view === "settings" && settingsPage !== "data") {
    params.set("settings", settingsPage);
  }

  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${
    window.location.hash
  }`;
}

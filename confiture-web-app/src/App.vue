<script setup lang="ts">
import { useHead } from "@unhead/vue";
import { onMounted } from "vue";

import GenericModal from "./components/GenericModal.vue";
import SiteFooter from "./components/layout/SiteFooter.vue";
import SiteHeader from "./components/layout/SiteHeader.vue";
import AraBreadcrumb from "./components/ui/AraBreadcrumb.vue";
import ToastNotification from "./components/ui/ToastNotification.vue";
import { useDebugStore } from "./store";
import { useAccountStore } from "./store/account";

// Default meta tags
useHead({
  title: "Audit d’accessibilité numérique",
  titleTemplate: "%s - Ara",
  meta: [
    {
      name: "description",
      content:
        "Avec Ara, vous évaluez manuellement les 106 critères du RGAA, générez un rapport d’audit et une déclaration d’accessibilité"
    },
    { name: "og:title", content: "Audit d’accessibilité numérique" },
    {
      name: "og:description",
      content:
        "Avec Ara, vous évaluez manuellement les 106 critères du RGAA, générez un rapport d’audit et une déclaration d’accessibilité"
    },
    { name: "og:url", content: "URL" },
    { name: "og:image", content: "image" },
    { name: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" }
  ]
});

const debugStore = useDebugStore();
debugStore.initDevModeSwitch();

const accountStore = useAccountStore();
onMounted(() => {
  if (accountStore.authToken) {
    accountStore.refreshToken();
  }
});
</script>

<template>
  <!-- Page title container, filled on page change -->
  <div
    id="page-title-alert"
    class="fr-sr-only"
    role="alert"
    aria-live="polite"
  />

  <div class="fr-skiplinks">
    <nav class="fr-container" role="navigation" aria-label="Accès rapide">
      <ul class="fr-skiplinks__list">
        <li>
          <a class="fr-link" href="#main">Contenu</a>
        </li>
        <li>
          <a class="fr-link" href="#footer">Pied de page</a>
        </li>
      </ul>
    </nav>
  </div>

  <GenericModal />

  <SiteHeader />

  <main id="main" role="main" class="fr-container fr-mb-12w" tabindex="-1">
    <AraBreadcrumb />
    <RouterView />
  </main>

  <SiteFooter />

  <ToastNotification />
</template>

<style scoped>
[id="main"]:target {
  scroll-margin: 2rem;
}

main {
  padding-top: 2.5rem;
}

main:has(.fr-breadcrumb) {
  padding-top: unset;
}
</style>

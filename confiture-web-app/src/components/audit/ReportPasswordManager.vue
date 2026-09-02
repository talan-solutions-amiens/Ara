<script lang="ts" setup>
import { ref } from "vue";

import { api } from "../../api";
import { useNotifications } from "../../composables/useNotifications";
import { DEFAULT_NOTIFICATION_ERROR_DESCRIPTION } from "../../enums";
import CopyButton from "../ui/CopyButton.vue";

const props = defineProps<{
  editUniqueId: string;
  reportPassword: string | null;
}>();

const notify = useNotifications();

const currentPassword = ref(props.reportPassword);
const regenerating = ref(false);

async function regenerate() {
  regenerating.value = true;
  try {
    const { reportPassword } = await api
      .put(`/api/audits/${props.editUniqueId}/report-password`)
      .json<{ reportPassword: string }>();
    currentPassword.value = reportPassword;
    notify("success", undefined, "Nouveau mot de passe généré");
  } catch {
    notify(
      "error",
      "Échec de la génération du mot de passe",
      DEFAULT_NOTIFICATION_ERROR_DESCRIPTION
    );
  } finally {
    regenerating.value = false;
  }
}
</script>

<template>
  <fieldset class="fr-p-0 fr-mt-4w report-password-fields">
    <legend>
      <h2 class="fr-h4">Mot de passe du rapport</h2>
    </legend>

    <p class="fr-text--sm notice">
      Ce mot de passe protège l’accès au rapport public de cet audit.
      Communiquez-le à la personne qui doit le consulter, en plus du lien du
      rapport.
    </p>

    <div class="password-row fr-mb-2w">
      <code class="password-value">{{ currentPassword }}</code>

      <CopyButton
        icon="fr-icon-file-copy-line"
        :content-to-copy="currentPassword ?? ''"
        label="Copier le mot de passe"
        success-label="Mot de passe copié"
      />

      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-refresh-line"
        :disabled="regenerating"
        @click="regenerate"
      >
        Générer un nouveau mot de passe
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.report-password-fields {
  border: none;
  max-width: 33rem;
}

.notice {
  color: var(--text-mention-grey);
}

.password-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.password-value {
  font-size: 1.1rem;
  padding: 0.25rem 0.75rem;
  background-color: var(--background-alt-grey);
  border-radius: 0.25rem;
}
</style>

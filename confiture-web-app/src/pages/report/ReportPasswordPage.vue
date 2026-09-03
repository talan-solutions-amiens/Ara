<script lang="ts" setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { api } from "../../api";
import PageMeta from "../../components/PageMeta";
import DsfrField from "../../components/ui/DsfrField.vue";

const route = useRoute();
const router = useRouter();

const consultUniqueId = route.params.uniqueId as string;

const password = ref("");
const submitting = ref(false);
const errorMessage = ref<string | null>(null);

async function onSubmit() {
  errorMessage.value = null;
  submitting.value = true;

  try {
    await api.post(`/api/reports/${consultUniqueId}/unlock`, {
      json: { password: password.value }
    });

    const redirect = (route.query.redirect as string) || `/rapport/${consultUniqueId}/`;
    router.replace(redirect);
  } catch {
    errorMessage.value = "Mot de passe incorrect. Merci de vérifier votre saisie.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <PageMeta title="Mot de passe requis - Rapport d’audit" />
  <div class="wrapper">
    <h1 class="fr-h1 fr-mb-3w">Mot de passe requis</h1>

    <p class="fr-text--xl fr-mb-4w">
      Ce rapport d’audit est protégé. Saisissez le mot de passe qui vous a été
      communiqué pour y accéder.
    </p>

    <form @submit.prevent="onSubmit">
      <DsfrField
        id="report-password"
        v-model="password"
        label="Mot de passe"
        hint="Exemple : renard-tulipe-42"
        required
      />

      <p
        v-if="errorMessage"
        class="fr-error-text fr-mb-3w"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <button class="fr-btn fr-mt-3w" type="submit" :disabled="submitting">
        Accéder au rapport
      </button>
    </form>
  </div>
</template>

<style scoped>
.wrapper {
  max-width: 49.5rem;
  margin: 0 auto;
}
</style>

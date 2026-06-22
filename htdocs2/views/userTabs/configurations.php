<?php
// Onglet Configurations : UI de config (equip_ui.html) affichée dans une iframe
?>

<div class="andromeda-panel andromeda-panel-embed">
  <div class="equip-ui-wrapper">
    <iframe
      src="/equip_ui.html?embed=1"
      class="equip-ui-frame"
      title="Equipment UI"
      loading="lazy"
    ></iframe>
  </div>
</div>

<style>
/* ✅ On neutralise complètement la “card” du site autour de l’onglet (bordure/ombre) */
.andromeda-panel.andromeda-panel-embed{
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  filter: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

.andromeda-panel.andromeda-panel-embed::before,
.andromeda-panel.andromeda-panel-embed::after{
  content: none !important;
  display: none !important;
}

/* ✅ ICI : plus AUCUN cadre autour de l’équipement */
.equip-ui-wrapper{
  width: 100%;
  height: clamp(580px, calc(100vh - 230px), 920px);
  min-height: 560px;
  overflow: hidden;

  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;

  margin: 0 !important;
  padding: 0 !important;
  position: relative;
}

.equip-ui-wrapper::before,
.equip-ui-wrapper::after{
  content: none !important;
  display: none !important;
}

/* IFRAME */
.equip-ui-frame{
  width: 100%;
  height: 100%;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  display: block;
  background: transparent !important;
}

@media (max-width: 960px){
  .equip-ui-wrapper{
    height: clamp(520px, 72vh, 820px);
  }
}
</style>

<?php

?>

<style>
    
    .config-card {
        background: var(--color-surface, #0b1221);
        border: 1px solid var(--color-border, #1e293b);
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        overflow: hidden;
        width: 100%;
        max-width: 1300px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
    }

    .config-header {
        background: rgba(8, 14, 26, 0.6);
        border-bottom: 1px solid var(--color-border, #1e293b);
        padding: 0.8rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
    }

    .config-title {
        color: var(--color-accent, #5eead4);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 1.1rem;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .config-icon {
        height: 24px; width: auto; opacity: 0.8;
        filter: drop-shadow(0 0 5px rgba(94, 234, 212, 0.4));
    }

    .config-subtitle {
        color: #94a3b8; font-size: 0.85rem; font-weight: 500;
    }

    
    .andromeda-config-frameWrap {
        width: 100%;
        background: rgba(0, 0, 0, 0.2);
        height: 780px; 
        position: relative; 
    }

    .andromeda-config-frame {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: transparent;
        
        opacity: 0; 
        transition: opacity 0.4s ease-in-out;
    }

    
    .config-loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        z-index: 10;
        pointer-events: none;
        transition: opacity 0.3s ease;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(94, 234, 212, 0.1);
        border-top-color: #5eead4; 
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-text {
        color: #5eead4;
        font-family: monospace;
        font-size: 0.8rem;
        letter-spacing: 1px;
        text-transform: uppercase;
        animation: pulse 1.5s infinite ease-in-out;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }
</style>

<div class="CMSContent">
    <div class="config-card">
        
        <div class="config-header">
            <h2 class="config-title">
                <svg class="config-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                System Configuration
            </h2>
            <span class="config-subtitle">Equipment & Drones Management</span>
        </div>

        <div class="andromeda-config-frameWrap">
            <div id="configLoader" class="config-loader">
                <div class="spinner"></div>
                <div class="loading-text">Loading Assets...</div>
            </div>

            <iframe 
                id="andromedaEquipFrame" 
                class="andromeda-config-frame" 
                src="/equip_ui.html?embed=1&v=havok_style_20260512" 
                title="Andromeda Equipment Configurations"
                loading="lazy"
            ></iframe>
        </div>
    </div>
</div>

<script>
    document.addEventListener("DOMContentLoaded", function() {
        const iframe = document.getElementById('andromedaEquipFrame');
        const loader = document.getElementById('configLoader');

        if (iframe && loader) {
            const showIframe = () => {
                setTimeout(() => {
                    loader.style.opacity = '0';
                    iframe.style.opacity = '1';
                    
                    setTimeout(() => {
                        loader.style.display = 'none';
                    }, 300);
                }, 80); 
            };

            iframe.addEventListener('load', showIframe);
        }
    });
</script>
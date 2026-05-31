<style>
    .contact-wrapper {
        display: grid;
        grid-template-columns: 1fr 350px;
        gap: 2rem;
        align-items: start;
    }

    @media (max-width: 900px) {
        .contact-wrapper { grid-template-columns: 1fr; }
    }

    .shop-card {
        background: var(--color-surface, #0b1221);
        border: 1px solid var(--color-border, #1e293b);
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        color: #fff;
    }

    .shop-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-accent, #5eead4);
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        border-bottom: 1px solid var(--color-border, #1e293b);
        padding-bottom: 1rem;
    }
    
    .card-subtitle {
        color: #94a3b8;
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
        display: block;
    }

    .contact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .contact-item {
        background: rgba(8, 14, 26, 0.6);
        border: 1px solid var(--color-border, #1e293b);
        border-radius: 6px;
        padding: 1.5rem;
        text-decoration: none;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .contact-item:hover {
        transform: translateY(-5px);
        border-color: var(--color-accent-strong, #22d3ee);
        background: rgba(15, 23, 42, 0.8);
    }

    .contact-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
        color: var(--color-accent, #5eead4);
    }

    .contact-label {
        font-weight: 700;
        color: #fff;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
    }

    .contact-value {
        font-size: 0.85rem;
        color: #94a3b8;
        word-break: break-all;
    }

    .donation-card {
        border-color: rgba(88, 101, 242, 0.35);
        text-align: center;
    }

    .donation-text {
        color: #cbd5e1;
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }

    .btn-donate {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 1rem;
        background: linear-gradient(135deg, #5865F2, #404EED);
        color: #fff;
        font-weight: 800;
        font-size: 1rem;
        text-transform: uppercase;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 15px rgba(88, 101, 242, 0.35);
        text-decoration: none;
    }

    .btn-donate:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(88, 101, 242, 0.5);
        filter: brightness(1.05);
    }

    .icon-box {
        width: 48px;
        height: 48px;
        background: rgba(255,255,255,0.05);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }
</style>

<div class="CMSContent">
    <div class="contact-wrapper">
        
        <div class="shop-card">
            <h2 class="shop-title">Communication Channels</h2>
            <span class="card-subtitle">Need help? Have a suggestion? Contact the administration team.</span>

            <div class="contact-grid">
                <a href="mailto:andromeda.server01@gmail.com" class="contact-item">
                    <div class="icon-box">✉️</div>
                    <span class="contact-label">Email Support</span>
                    <span class="contact-value">andromeda.server01@gmail.com</span>
                </a>
            </div>
        </div>

        

    </div>
</div>
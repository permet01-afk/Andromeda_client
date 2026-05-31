<?php
require_once 'libs/QuestService.php';

$section = isset($_GET['section']) ? (string)$_GET['section'] : 'contracts';
$allowedSections = ['contracts', 'basic', 'pvp', 'havok'];
if (!in_array($section, $allowedSections, true)) {
    $section = 'contracts';
}

$playerId = (int)($_SESSION['player_id'] ?? 0);
$questToken = $questCsrfToken ?? ($_SESSION['quest_csrf_token'] ?? '');
$questService = new QuestService($db, $playerId);
$questError = '';
$questNotice = '';

$noticeMap = [
    'accepted' => 'Quest accepted.',
    'claimed' => 'Quest reward claimed.',
    'aborted' => 'Quest aborted.',
    'contract_claimed' => 'Hunting contract reward claimed.',
];
if (isset($_GET['quest_msg']) && isset($noticeMap[$_GET['quest_msg']])) {
    $questNotice = $noticeMap[$_GET['quest_msg']];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['quest_action'])) {
    try {
        $postedToken = (string)($_POST['csrf_token'] ?? '');
        if ($questToken === '' || !hash_equals((string)$questToken, $postedToken)) {
            throw new Exception('Security token expired. Please refresh the page and try again.');
        }

        $action = (string)$_POST['quest_action'];
        if ($action === 'accept_basic') {
            $questService->acceptBasicQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=basic&quest_msg=accepted');
            exit;
        }

        if ($action === 'claim_basic') {
            $questService->claimBasicQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=basic&quest_msg=claimed');
            exit;
        }

        if ($action === 'abort_basic') {
            $questService->abortBasicQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=basic&quest_msg=aborted');
            exit;
        }

        if ($action === 'accept_pvp') {
            $questService->acceptPvpQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=pvp&quest_msg=accepted');
            exit;
        }

        if ($action === 'claim_pvp') {
            $questService->claimPvpQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=pvp&quest_msg=claimed');
            exit;
        }

        if ($action === 'abort_pvp') {
            $questService->abortPvpQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=pvp&quest_msg=aborted');
            exit;
        }

        if ($action === 'accept_havok') {
            $questService->acceptHavokQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=havok&quest_msg=accepted');
            exit;
        }

        if ($action === 'claim_havok') {
            $questService->claimHavokQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=havok&quest_msg=claimed');
            exit;
        }

        if ($action === 'abort_havok') {
            $questService->abortHavokQuest((string)($_POST['quest_code'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=havok&quest_msg=aborted');
            exit;
        }

        if ($action === 'claim_contract') {
            $questService->claimHuntingContract((string)($_POST['npc_name'] ?? ''));
            header('Location: view.php?page=user&tab=quests&section=contracts&quest_msg=contract_claimed');
            exit;
        }
    } catch (Exception $e) {
        $questError = $e->getMessage();
    }
}

try {
    $questService->preparePage();
    $huntingContracts = $questService->getHuntingContracts();
    $basicQuests = $questService->getBasicQuests();
    $pvpQuests = $questService->getPvpQuests();
    $havokQuests = $questService->getHavokQuests();
    $activeQuestCount = $questService->getActiveQuestCount();
    $maxActiveQuestCount = $questService->getMaxActiveQuestCount();
} catch (Exception $e) {
    $huntingContracts = [];
    $basicQuests = [];
    $pvpQuests = [];
    $havokQuests = [];
    $activeQuestCount = 0;
    $maxActiveQuestCount = QuestService::MAX_ACTIVE_SITE_QUESTS;
    $questError = $questError !== '' ? $questError : $e->getMessage();
}

function quest_h($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function quest_status_data(array $quest): array
{
    $status = (string)($quest['status'] ?? 'available');
    $isAccepted = $status === 'in_progress';
    $isCompleted = $status === 'completed';
    $isReady = $isAccepted && !empty($quest['is_complete']);

    return [
        'isAccepted' => $isAccepted,
        'isCompleted' => $isCompleted,
        'isReady' => $isReady,
        'class' => $isCompleted ? 'quest-status--completed' : ($isReady ? 'quest-status--ready' : ($isAccepted ? 'quest-status--progress' : 'quest-status--available')),
        'label' => $isCompleted ? 'Completed' : ($isReady ? 'Ready' : ($isAccepted ? 'In progress' : 'Available')),
    ];
}

function quest_has_priority_open(array $quests): bool
{
    foreach ($quests as $quest) {
        $data = quest_status_data($quest);
        if (!$data['isCompleted'] && ($data['isReady'] || $data['isAccepted'])) {
            return true;
        }
    }

    return false;
}

function quest_should_open_default(array $quest, bool $hasPriorityOpen, bool &$openedFirstAvailable): bool
{
    $data = quest_status_data($quest);
    if ($data['isCompleted']) {
        return false;
    }
    if ($data['isReady'] || $data['isAccepted']) {
        return true;
    }
    if (!$hasPriorityOpen && !$openedFirstAvailable) {
        $openedFirstAvailable = true;
        return true;
    }

    return false;
}

function quest_progress_summary(array $objectives): string
{
    if (!$objectives) {
        return 'No objective.';
    }

    $firstObjective = $objectives[0];
    foreach ($objectives as $objective) {
        if (empty($objective['complete'])) {
            $firstObjective = $objective;
            break;
        }
    }

    return sprintf(
        '%s: %s / %s',
        (string)($firstObjective['label'] ?? 'Progress'),
        number_format((int)($firstObjective['current'] ?? 0)),
        number_format((int)($firstObjective['required'] ?? 0))
    );
}

function quest_card_dom_id(string $prefix, array $quest): string
{
    $safeCode = preg_replace('/[^a-zA-Z0-9_-]+/', '-', (string)($quest['code'] ?? $quest['id'] ?? uniqid('quest', false)));
    return $prefix . '-' . trim($safeCode, '-');
}
?>

<div class="quest-page" data-quest-root data-current-section="<?php echo quest_h($section); ?>">
    <header class="quest-page__header">
        <div>
            <h2>Quest</h2>
            <p>Complete hunting contracts, basic assignments, PvP missions and Havok trials to earn rewards.</p>
        </div>
    </header>

    <nav class="quest-tabs" aria-label="Quest sections" role="tablist">
        <a class="quest-tab<?php echo $section === 'contracts' ? ' is-active' : ''; ?>" href="view.php?page=user&amp;tab=quests&amp;section=contracts" data-quest-tab="contracts" role="tab" aria-selected="<?php echo $section === 'contracts' ? 'true' : 'false'; ?>">Hunting Contracts</a>
        <a class="quest-tab<?php echo $section === 'basic' ? ' is-active' : ''; ?>" href="view.php?page=user&amp;tab=quests&amp;section=basic" data-quest-tab="basic" role="tab" aria-selected="<?php echo $section === 'basic' ? 'true' : 'false'; ?>">Basic Quests</a>
        <a class="quest-tab<?php echo $section === 'pvp' ? ' is-active' : ''; ?>" href="view.php?page=user&amp;tab=quests&amp;section=pvp" data-quest-tab="pvp" role="tab" aria-selected="<?php echo $section === 'pvp' ? 'true' : 'false'; ?>">PVP</a>
        <a class="quest-tab<?php echo $section === 'havok' ? ' is-active' : ''; ?>" href="view.php?page=user&amp;tab=quests&amp;section=havok" data-quest-tab="havok" role="tab" aria-selected="<?php echo $section === 'havok' ? 'true' : 'false'; ?>">Havok Quests</a>
    </nav>

    <?php if ($questNotice !== '') { ?>
        <div class="quest-feedback quest-feedback--success"><?php echo quest_h($questNotice); ?></div>
    <?php } ?>

    <?php if ($questError !== '') { ?>
        <div class="quest-feedback quest-feedback--error"><?php echo quest_h($questError); ?></div>
    <?php } ?>

    <div class="quest-panels" data-quest-panels>
        <div class="quest-panel<?php echo $section === 'contracts' ? ' is-active' : ''; ?>" data-quest-section="contracts" role="tabpanel"<?php echo $section === 'contracts' ? '' : ' hidden'; ?>>
            <?php include __DIR__ . '/questSections/hunting_contracts.php'; ?>
        </div>

        <div class="quest-panel<?php echo $section === 'basic' ? ' is-active' : ''; ?>" data-quest-section="basic" role="tabpanel"<?php echo $section === 'basic' ? '' : ' hidden'; ?>>
            <?php include __DIR__ . '/questSections/basic_quests.php'; ?>
        </div>

        <div class="quest-panel<?php echo $section === 'pvp' ? ' is-active' : ''; ?>" data-quest-section="pvp" role="tabpanel"<?php echo $section === 'pvp' ? '' : ' hidden'; ?>>
            <?php include __DIR__ . '/questSections/pvp_quests.php'; ?>
        </div>

        <div class="quest-panel<?php echo $section === 'havok' ? ' is-active' : ''; ?>" data-quest-section="havok" role="tabpanel"<?php echo $section === 'havok' ? '' : ' hidden'; ?>>
            <?php include __DIR__ . '/questSections/havok_quests.php'; ?>
        </div>
    </div>
</div>

<script>
(function(){
    const boot = function(){
        const root = document.querySelector('[data-quest-root]');
        if (!root || root.dataset.questReady === '1') return;
        root.dataset.questReady = '1';

        const tabs = Array.from(root.querySelectorAll('[data-quest-tab]'));
        const panels = Array.from(root.querySelectorAll('[data-quest-section]'));
        const allowedSections = new Set(tabs.map(tab => tab.dataset.questTab));

        const normalizeSection = function(section){
            return allowedSections.has(section) ? section : 'contracts';
        };

        const setSection = function(section, updateHistory){
            section = normalizeSection(section);
            root.dataset.currentSection = section;

            tabs.forEach(function(tab){
                const active = tab.dataset.questTab === section;
                tab.classList.toggle('is-active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });

            panels.forEach(function(panel){
                const active = panel.dataset.questSection === section;
                panel.classList.toggle('is-active', active);
                if (active) {
                    panel.removeAttribute('hidden');
                } else {
                    panel.setAttribute('hidden', 'hidden');
                }
            });

            if (updateHistory && window.history && window.URL) {
                const url = new URL(window.location.href);
                url.searchParams.set('page', 'user');
                url.searchParams.set('tab', 'quests');
                url.searchParams.set('section', section);
                url.searchParams.delete('quest_msg');
                window.history.pushState({questSection: section}, '', url.toString());
            }
        };

        tabs.forEach(function(tab){
            tab.addEventListener('click', function(event){
                event.preventDefault();
                setSection(tab.dataset.questTab, true);
            });
        });

        root.querySelectorAll('[data-quest-toggle]').forEach(function(toggle){
            toggle.addEventListener('click', function(){
                const card = toggle.closest('[data-quest-card]');
                const contentId = toggle.getAttribute('aria-controls');
                const content = contentId ? document.getElementById(contentId) : null;
                if (!card || !content) return;

                const expanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                card.classList.toggle('is-open', !expanded);
                if (expanded) {
                    content.setAttribute('hidden', 'hidden');
                } else {
                    content.removeAttribute('hidden');
                }
            });
        });

        window.addEventListener('popstate', function(){
            const url = new URL(window.location.href);
            setSection(url.searchParams.get('section') || 'contracts', false);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
</script>

/**
 * Main Application Controller for Eagle Extra Links Inspector Plugin
 * Connects Eagle lifecycle events, UI interactions, storage persistence, and IPC server.
 */

(function () {
    // Current state
    let currentItem = null;
    let currentLinks = [];
    let pendingDeleteIndex = null;
    const debouncedSaver = StorageManager.createDebouncedSaver(300);

    // DOM Elements
    const urlListEl = document.getElementById('url-list');
    const addBtn = document.getElementById('add-btn');
    const saveStatusEl = document.getElementById('save-status');
    const settingsBtn = document.getElementById('settings-btn');

    // Delete Modal Elements
    const deleteModal = document.getElementById('delete-modal');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    // Settings Modal Elements
    const settingsModal = document.getElementById('settings-modal');
    const settingServerEnabled = document.getElementById('setting-server-enabled');
    const settingHost = document.getElementById('setting-host');
    const settingPort = document.getElementById('setting-port');
    const settingRestrictAccess = document.getElementById('setting-restrict-access');
    const restrictionControls = document.getElementById('restriction-controls');
    const settingAllowedClients = document.getElementById('setting-allowed-clients');
    const settingsCancelBtn = document.getElementById('settings-cancel-btn');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const chipBtns = document.querySelectorAll('.chip-btn');

    // SVG Icons
    const OPEN_ICON_SVG = '<svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>';
    const DELETE_ICON_SVG = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

    /**
     * Escape HTML string helper.
     */
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Status indicator helper.
     */
    function setStatus(state) {
        if (!saveStatusEl) return;
        saveStatusEl.className = 'save-status';
        if (state === 'saving') {
            saveStatusEl.textContent = 'Saving...';
            saveStatusEl.classList.add('saving');
        } else if (state === 'saved') {
            saveStatusEl.textContent = 'Saved';
            saveStatusEl.classList.add('saved');
        } else if (state === 'error') {
            saveStatusEl.textContent = 'Error';
        }
    }

    /**
     * Safely opens an external URL using eagle.shell.openExternal.
     */
    async function openUrl(rawUrl) {
        if (!rawUrl || !rawUrl.trim()) {
            return;
        }

        let target = rawUrl.trim();
        // If it starts with common web formats without protocol, prepend https://
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) {
            target = 'https://' + target;
        }

        // Validate protocol scheme
        try {
            if (typeof eagle !== 'undefined' && eagle.shell && eagle.shell.openExternal) {
                await eagle.shell.openExternal(target);
            } else {
                window.open(target, '_blank');
            }
        } catch (err) {
            console.error('[ExtraLinks] Error opening URL:', err);
        }
    }

    /**
     * Renders URL fields in the Inspector view.
     */
    function renderLinks(links) {
        currentLinks = Array.isArray(links) ? [...links] : [];

        // If no links, initialize with 1 blank field (REQ-1.2, AC-1.1)
        if (currentLinks.length === 0) {
            currentLinks = [''];
        }

        urlListEl.innerHTML = '';

        currentLinks.forEach((link, index) => {
            const row = document.createElement('div');
            row.className = 'url-row';
            row.dataset.index = index;

            row.innerHTML = `
                <div class="input-wrapper">
                    <input type="text" class="url-input" placeholder="https://... or obsidian://..." value="${escapeHtml(link)}">
                    <button type="button" class="icon-btn link-btn" title="Open URL in default app">
                        ${OPEN_ICON_SVG}
                    </button>
                </div>
                <button type="button" class="icon-btn delete-btn" title="Delete URL">
                    ${DELETE_ICON_SVG}
                </button>
            `;

            const input = row.querySelector('.url-input');
            const linkBtn = row.querySelector('.link-btn');
            const deleteBtn = row.querySelector('.delete-btn');

            // Input change & debounced auto-save
            input.addEventListener('input', (e) => {
                currentLinks[index] = e.target.value;
                if (currentItem) {
                    debouncedSaver.save(currentItem.id, currentLinks, currentItem, {
                        onSaving: () => setStatus('saving'),
                        onSaved: () => setStatus('saved'),
                        onError: () => setStatus('error')
                    });
                }
            });

            // Flush on blur
            input.addEventListener('blur', () => {
                debouncedSaver.flush({
                    onSaving: () => setStatus('saving'),
                    onSaved: () => setStatus('saved')
                });
            });

            // Enter key triggers open
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    openUrl(input.value);
                }
            });

            // Click link button
            linkBtn.addEventListener('click', () => {
                openUrl(input.value);
            });

            // Click delete button
            deleteBtn.addEventListener('click', () => {
                pendingDeleteIndex = index;
                showDeleteModal();
            });

            urlListEl.appendChild(row);
        });

        setStatus('saved');
    }

    /**
     * Adds a new URL field.
     */
    function addField() {
        currentLinks.push('');
        renderLinks(currentLinks);

        // Focus the newly added input
        const inputs = urlListEl.querySelectorAll('.url-input');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
        }

        if (currentItem) {
            StorageManager.saveLinks(currentItem.id, currentLinks, currentItem);
        }
    }

    /**
     * Shows the delete confirmation modal.
     */
    function showDeleteModal() {
        deleteModal.classList.remove('hidden');
        modalConfirmBtn.focus();
    }

    /**
     * Hides the delete confirmation modal.
     */
    function hideDeleteModal() {
        deleteModal.classList.add('hidden');
        pendingDeleteIndex = null;
    }

    /**
     * Confirms deletion of the targeted field.
     */
    async function confirmDelete() {
        if (pendingDeleteIndex !== null && pendingDeleteIndex >= 0 && pendingDeleteIndex < currentLinks.length) {
            currentLinks.splice(pendingDeleteIndex, 1);
            
            // If all fields were deleted, re-initialize with single empty field (AC-4.5)
            if (currentLinks.length === 0) {
                currentLinks = [''];
            }

            renderLinks(currentLinks);

            if (currentItem) {
                await StorageManager.saveLinks(currentItem.id, currentLinks, currentItem);
            }
        }
        hideDeleteModal();
    }

    /**
     * Populates and opens the IPC Settings Modal.
     */
    function openSettingsModal() {
        const config = ConfigManager.getConfig();

        settingServerEnabled.checked = config.serverEnabled;
        settingHost.value = config.host || '127.0.0.1';
        settingPort.value = config.port || 41596;
        settingRestrictAccess.checked = config.accessRestrictionEnabled;
        settingAllowedClients.value = (config.allowedClients || ['self']).join(', ');

        toggleRestrictionControls(config.accessRestrictionEnabled);
        settingsModal.classList.remove('hidden');
    }

    /**
     * Hides the IPC Settings Modal.
     */
    function hideSettingsModal() {
        settingsModal.classList.add('hidden');
    }

    /**
     * Shows or hides the client access restriction subgroup.
     */
    function toggleRestrictionControls(show) {
        if (show) {
            restrictionControls.classList.remove('hidden');
        } else {
            restrictionControls.classList.add('hidden');
        }
    }

    /**
     * Saves IPC settings from modal form.
     */
    function saveSettings() {
        const serverEnabled = settingServerEnabled.checked;
        const host = settingHost.value.trim() || '127.0.0.1';
        let port = parseInt(settingPort.value, 10);
        if (isNaN(port) || port < 1024 || port > 65535) {
            port = 41596;
        }

        const accessRestrictionEnabled = settingRestrictAccess.checked;
        const allowedClients = settingAllowedClients.value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        ConfigManager.saveConfig({
            serverEnabled,
            host,
            port,
            accessRestrictionEnabled,
            allowedClients: allowedClients.length > 0 ? allowedClients : ['self']
        });

        hideSettingsModal();
    }

    // Bind Event Listeners
    addBtn.addEventListener('click', addField);

    modalCancelBtn.addEventListener('click', hideDeleteModal);
    modalConfirmBtn.addEventListener('click', confirmDelete);

    // Modal backdrop clicks & Keyboard shortcuts
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) hideDeleteModal();
    });

    settingsBtn.addEventListener('click', openSettingsModal);
    settingsCancelBtn.addEventListener('click', hideSettingsModal);
    settingsSaveBtn.addEventListener('click', saveSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) hideSettingsModal();
    });

    settingRestrictAccess.addEventListener('change', (e) => {
        toggleRestrictionControls(e.target.checked);
    });

    // Quick suggestion chips
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const chipValue = btn.dataset.chip;
            let currentVal = settingAllowedClients.value.trim();
            const existing = currentVal.split(',').map(s => s.trim()).filter(Boolean);
            if (!existing.includes(chipValue)) {
                existing.push(chipValue);
                settingAllowedClients.value = existing.join(', ');
            }
        });
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!deleteModal.classList.contains('hidden')) hideDeleteModal();
            if (!settingsModal.classList.contains('hidden')) hideSettingsModal();
        }
    });

    // Handle real-time updates from IPC server
    IpcServer.onItemUpdated((itemId, updatedLinks) => {
        if (currentItem && currentItem.id === itemId) {
            renderLinks(updatedLinks);
        }
    });

    // Eagle Plugin Lifecycle Initialization
    if (typeof eagle !== 'undefined' && eagle.onPluginCreate) {
        eagle.onPluginCreate(async () => {
            try {
                // Initialize theme
                if (eagle.app && eagle.app.theme) {
                    const theme = await eagle.app.theme;
                    document.body.setAttribute('theme', theme);
                }

                // Initialize item
                if (eagle.item && eagle.item.getSelected) {
                    const items = await eagle.item.getSelected();
                    if (items && items.length > 0) {
                        currentItem = items[0];
                        const links = await StorageManager.loadLinks(currentItem.id, currentItem);
                        renderLinks(links);
                    } else {
                        renderLinks(['']);
                    }
                }

                // Start IPC Server
                await IpcServer.start();
            } catch (err) {
                console.error('[ExtraLinks] onPluginCreate error:', err);
            }
        });

        // Theme change handler
        if (eagle.onThemeChanged) {
            eagle.onThemeChanged((theme) => {
                document.body.setAttribute('theme', theme);
            });
        }

        // Graceful exit
        if (eagle.onPluginBeforeExit) {
            eagle.onPluginBeforeExit(async () => {
                await debouncedSaver.flush();
                await IpcServer.stop();
            });
        }
    } else {
        // Standalone browser / testing fallback
        renderLinks(['https://example.com', 'obsidian://adv-uri?vault=Main&filepath=Note.md']);
        IpcServer.start();
    }
})();

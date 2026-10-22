/**
 * Synapse Research - Core Application Logic
 * トップダウンとボトムアップを統合する温かみのある思考整理ノート
 */

class SynapseApp {
  constructor() {
    this.nodes = [];
    this.connections = [];
    this.groups = [];
    this.draggingGroup = null;
    this.groupDragOffset = { x: 0, y: 0 };
    this.groupMemberNodes = [];
    this.resizingGroup = null;
    this.startGroupResize = null;
    this.aimSnappedPort = null;
    this.selectedNodeId = null;
    this.selectedConnectionId = null;

    // 巻き戻し（Undo）履歴スタック
    this.history = [];
    this.maxHistory = 25;

    // 複数添付ファイルリスト [{ name, text, size }]
    this.attachedFiles = [];

    // モーダル編集中のプレビューカード一覧
    this.pendingCards = [];

    // キャンバス表示状態（パン＆ズーム）
    this.pan = { x: 70, y: 30 };
    this.zoom = 1.0;
    this.isPanning = false;
    this.startPan = { x: 0, y: 0 };

    // ノードドラッグ状態
    this.draggingNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.hasDragged = false;

    // ノードリサイズ状態
    this.resizingNode = null;
    this.startResize = null;

    // プロジェクト管理状態
    this.currentProjectId = localStorage.getItem("synapse_active_project_id") || null;
    this.currentProjectName = localStorage.getItem("synapse_active_project_name") || "未保存のプロジェクト";

    // 接続線ドラッグ状態
    this.connectingSourceId = null;

    // タッチ・Apple Pencil・ピンチズーム状態
    this.isUsingStylus = false;
    this.stylusTimeout = null;
    this.connectingSourcePort = null;

    // Firebase クラウド同期状態
    this.firebaseApp = null;
    this.firebaseAuth = null;
    this.firestore = null;
    this.currentUser = null;
    this.syncDebounceTimer = null;
    this.authMode = "login";

    // DOM要素の取得
    this.cacheDom();

    // データの読み込み
    this.loadState();

    // イベントリスナーの登録
    this.bindEvents();

    // 初期描画
    this.render();
    this.updateCanvasTransform();

    // タッチ＆Apple Pencilジェスチャーの初期化
    this.initTouchAndGestures();

    // Firebaseの初期化
    this.initFirebase();
  }

  cacheDom() {
    this.container = document.getElementById("canvas-container");
    this.board = document.getElementById("canvas");
    this.groupsContainer = document.getElementById("groups-container");
    this.nodesContainer = document.getElementById("nodes-container");
    this.connectionsSvg = document.getElementById("connections-layer");
    this.dragLineLayer = document.getElementById("drag-line-layer");
    this.dragLine = document.getElementById("drag-line");
    this.emptyState = document.getElementById("canvas-empty-state");

    // ズーム
    this.zoomInBtn = document.getElementById("zoom-in-btn");
    this.zoomOutBtn = document.getElementById("zoom-out-btn");
    this.zoomResetBtn = document.getElementById("zoom-reset-btn");
    this.zoomLevelText = document.getElementById("zoom-level");

    // ヘッダーボタン
    this.addTopdownBtn = document.getElementById("add-topdown-btn");
    this.addBottomupBtn = document.getElementById("add-bottomup-btn");
    this.addSynthesisBtn = document.getElementById("add-synthesis-btn");
    this.addCustomBtn = document.getElementById("add-custom-btn");
    this.addGroupBtn = document.getElementById("add-group-btn");
    this.hamburgerMenuBtn = document.getElementById("hamburger-menu-btn");
    this.hamburgerDropdown = document.getElementById("hamburger-dropdown");
    this.undoBtn = document.getElementById("undo-btn");
    this.exportJsonBtn = document.getElementById("export-json-btn");
    this.importJsonInput = document.getElementById("import-json-input");
    this.resetCanvasBtn = document.getElementById("reset-canvas-btn");

    // ノートサイドバー
    this.noteSidebar = document.getElementById("note-sidebar");
    this.closeNoteBtn = document.getElementById("close-note-btn");
    this.noteEmptyState = document.getElementById("note-empty-state");
    this.noteActiveContent = document.getElementById("note-active-content");
    this.noteTypeBadge = document.getElementById("note-type-badge");
    this.nodeTitleInput = document.getElementById("node-title-input");
    this.nodeTypeSelect = document.getElementById("node-type-select");
    this.genreChips = document.querySelectorAll("#genre-selector-chips .genre-chip");
    this.nodeCustomNameGroup = document.getElementById("node-custom-name-group");
    this.nodeCustomNameInput = document.getElementById("node-custom-name-input");
    this.nodeStatusSelect = document.getElementById("node-status-select");
    this.nodeBodyInput = document.getElementById("node-body-input");
    this.nodeTagsInput = document.getElementById("node-tags-input");
    this.nodeGroupSelect = document.getElementById("node-group-select");
    this.deleteNodeBtn = document.getElementById("delete-node-btn");

    // AIサイドバー
    this.aiSidebar = document.getElementById("ai-sidebar");
    this.toggleAiBtn = document.getElementById("toggle-ai-btn");
    this.closeAiBtn = document.getElementById("close-ai-btn");
    this.tabAuto = document.getElementById("tab-auto");
    this.tabManual = document.getElementById("tab-manual");
    this.panelAuto = document.getElementById("ai-panel-auto");
    this.panelManual = document.getElementById("ai-panel-manual");
    this.apiKeyInput = document.getElementById("gemini-api-key");
    this.dropZone = document.getElementById("drop-zone");
    this.fileInput = document.getElementById("ai-file-input");
    this.attachedFilesContainer = document.getElementById("attached-files-container");
    this.attachedFilesList = document.getElementById("attached-files-list");
    this.attachedCount = document.getElementById("attached-count");
    this.clearFilesBtn = document.getElementById("clear-files-btn");
    this.aiTextInput = document.getElementById("ai-text-input");
    this.aiInstructionInput = document.getElementById("ai-instruction-input");
    this.runAiBtn = document.getElementById("run-ai-generate-btn");
    this.aiStatus = document.getElementById("ai-status");

    // 手動コピペ
    this.manualSourceText = document.getElementById("manual-source-text");
    this.manualInstructionInput = document.getElementById("manual-instruction-input");
    this.copyPromptBtn = document.getElementById("copy-prompt-btn");
    this.manualResultJson = document.getElementById("manual-result-json");
    this.applyManualResultBtn = document.getElementById("apply-manual-result-btn");

    // 確認モーダル
    this.previewModal = document.getElementById("preview-modal");
    this.closeModalBtn = document.getElementById("close-modal-btn");
    this.previewCardsList = document.getElementById("preview-cards-list");
    this.addManualPreviewCardBtn = document.getElementById("add-manual-preview-card-btn");
    this.cancelPreviewBtn = document.getElementById("cancel-preview-btn");
    this.confirmPreviewBtn = document.getElementById("confirm-preview-btn");
    this.confirmBtnCount = document.getElementById("confirm-btn-count");

    // 接続線編集ツールバー
    this.connToolbar = document.getElementById("connection-toolbar");
    this.connDeleteBtn = document.getElementById("conn-delete-btn");

    // プロジェクト保存・管理モーダル
    this.manageProjectsBtn = document.getElementById("manage-projects-btn");
    this.projectsModal = document.getElementById("projects-modal");
    this.closeProjectsModalBtn = document.getElementById("close-projects-modal-btn");
    this.closeProjectsBtn = document.getElementById("close-projects-btn");
    this.newProjectNameInput = document.getElementById("new-project-name");
    this.saveNewProjectBtn = document.getElementById("save-new-project-btn");
    this.currentProjectStatus = document.getElementById("current-project-status");
    this.savedProjectCount = document.getElementById("saved-project-count");
    this.projectsListContainer = document.getElementById("projects-list-container");

    // アカウント認証・クラウド同期
    this.authBtn = document.getElementById("auth-btn");
    this.authBtnLabel = document.getElementById("auth-btn-label");
    this.syncStatusIndicator = document.getElementById("sync-status-indicator");
    this.authModal = document.getElementById("auth-modal");
    this.closeAuthModalBtn = document.getElementById("close-auth-modal-btn");
    this.closeAuthBottomBtn = document.getElementById("close-auth-bottom-btn");
    this.authLoggedInView = document.getElementById("auth-logged-in-view");
    this.authFormsView = document.getElementById("auth-forms-view");
    this.authUserEmail = document.getElementById("auth-user-email");
    this.doLogoutBtn = document.getElementById("do-logout-btn");
    this.manualCloudPullBtn = document.getElementById("manual-cloud-pull-btn");
    this.authTabLogin = document.getElementById("auth-tab-login");
    this.authTabRegister = document.getElementById("auth-tab-register");
    this.authEmailInput = document.getElementById("auth-email-input");
    this.authPasswordInput = document.getElementById("auth-password-input");
    this.authSubmitBtn = document.getElementById("auth-submit-btn");
    this.authErrorMsg = document.getElementById("auth-error-msg");
    this.authEmailVerifiedBadge = document.getElementById("auth-email-verified-badge");
    this.authVerifyWarning = document.getElementById("auth-verify-warning");
    this.resendVerifyEmailBtn = document.getElementById("resend-verify-email-btn");
    this.doDeleteAccountBtn = document.getElementById("do-delete-account-btn");
    this.authTosContainer = document.getElementById("auth-tos-container");
    this.authTosCheckbox = document.getElementById("auth-tos-checkbox");
    this.openTosBtn = document.getElementById("open-tos-btn");
    this.tosModal = document.getElementById("tos-modal");
    this.closeTosModalBtn = document.getElementById("close-tos-modal-btn");
    this.closeTosBottomBtn = document.getElementById("close-tos-bottom-btn");
  }

  // キャンバス上の座標をマウス位置から100%正確に取得（ヘッダー余白・ズーム・パン完全補正）
  getCanvasCoords(e) {
    const rect = this.container.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0));
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0));
    return {
      x: (clientX - rect.left - this.pan.x) / this.zoom,
      y: (clientY - rect.top - this.pan.y) / this.zoom
    };
  }

  // ==========================================
  // 2. ストレージ ＆ データ救出・自動バックアップ
  // ==========================================
  loadState() {
    const savedApiKey = localStorage.getItem("synapse_gemini_key");
    if (savedApiKey) {
      this.apiKeyInput.value = savedApiKey;
    }

    // まず現在のキーから読み込み
    const saved = localStorage.getItem("synapse_notebook_data_v2");
    let loaded = false;

    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data.nodes) && data.nodes.length > 0) {
          this.nodes = data.nodes;
          this.connections = Array.isArray(data.connections) ? data.connections : [];
          this.groups = Array.isArray(data.groups) ? data.groups : [];
          if (data.pan) this.pan = data.pan;
          if (data.zoom) this.zoom = data.zoom;
          loaded = true;
        }
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }

    // 既存の黄色い救出バナーがあれば消去
    const existingBanner = document.getElementById("rescue-banner");
    if (existingBanner) existingBanner.remove();

    // ★ 黄色い救出バナーの自動ポップアップは暫定的に停止（必要時のみ内部保持）
    // this.checkForRecoverableData(!loaded);
  }

  // 過去のすべての保存データをくまなく探索して救出する
  checkForRecoverableData(autoPrompt) {
    const backupKeys = [
      "synapse_notebook_data",
      "synapse_research_data",
      ...Object.keys(localStorage).filter(k => k.startsWith("synapse_backup_") || k.startsWith("synapse_auto_backup_"))
    ];

    const foundBackups = [];

    for (const key of backupKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
            foundBackups.push({
              key: key,
              nodesCount: parsed.nodes.length,
              connectionsCount: (parsed.connections || []).length,
              updatedAt: parsed.updatedAt || parsed.exportedAt || "日時不明",
              data: parsed
            });
          }
        } catch (e) {}
      }
    }

    if (foundBackups.length > 0) {
      // 最新の更新日時のものを先頭にする
      foundBackups.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      this.showRescueBanner(foundBackups);
    }
  }

  showRescueBanner(backups) {
    // 既存のバナーがあれば削除
    const existing = document.getElementById("rescue-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "rescue-banner";
    banner.className = "rescue-banner";

    const best = backups[0];
    banner.innerHTML = `
      <div class="rescue-content">
        <span class="rescue-icon">📦</span>
        <div class="rescue-text">
          <strong>過去に作成されたカードデータ（${best.nodesCount}枚）が見つかりました！</strong>
          <span>保存日時: ${best.updatedAt !== "日時不明" ? new Date(best.updatedAt).toLocaleString("ja-JP") : "直近のデータ"}（${backups.length}件の履歴あり）</span>
        </div>
      </div>
      <div class="rescue-actions">
        <button id="btn-do-restore" class="btn btn-primary" style="padding: 6px 14px; font-weight: 600;">
          今すぐカードを復元する
        </button>
        <button id="btn-dismiss-rescue" class="btn btn-ghost" style="padding: 6px 10px;">
          閉じる
        </button>
      </div>
    `;

    document.body.prepend(banner);

    document.getElementById("btn-do-restore").addEventListener("click", () => {
      this.pushHistory();
      this.nodes = best.data.nodes;
      this.connections = best.data.connections || [];
      if (best.data.pan) this.pan = best.data.pan;
      if (best.data.zoom) this.zoom = best.data.zoom;
      this.render();
      this.updateCanvasTransform();
      this.saveState();
      banner.remove();
      alert(`🎉 ${best.nodesCount}枚のカードを正常に復元しました！`);
    });

    document.getElementById("btn-dismiss-rescue").addEventListener("click", () => {
      banner.remove();
    });
  }

  saveState() {
    const data = {
      nodes: this.nodes,
      connections: this.connections,
      groups: this.groups,
      pan: this.pan,
      zoom: this.zoom,
      projectId: this.currentProjectId,
      projectName: this.currentProjectName,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("synapse_notebook_data_v2", JSON.stringify(data));

    // もしプロジェクトが開かれている場合、そのスロットも同時に自動保存
    if (this.currentProjectId) {
      try {
        localStorage.setItem(`synapse_proj_data_${this.currentProjectId}`, JSON.stringify(data));
        const list = this.getProjectsList();
        const p = list.find(item => item.id === this.currentProjectId);
        if (p) {
          p.updatedAt = data.updatedAt;
          p.nodesCount = this.nodes.length;
          p.connectionsCount = this.connections.length;
          this.saveProjectsList(list);
        }
      } catch (e) {}
    }

    // ★ 自動回転バックアップ（カードが1枚以上ある場合、過去5回分を安全に永久退避）
    if (this.nodes.length > 0) {
      try {
        const backupIdx = (Date.now() % 5) + 1;
        localStorage.setItem(`synapse_auto_backup_${backupIdx}`, JSON.stringify(data));
      } catch (e) {}
    }

    // クラウド自動同期（ログイン中の場合）
    this.syncToCloud();
  }

  // ==========================================
  // 3. 巻き戻し（Undo）履歴機能
  // ==========================================
  pushHistory() {
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      connections: JSON.parse(JSON.stringify(this.connections)),
      groups: JSON.parse(JSON.stringify(this.groups))
    };
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  undo() {
    if (this.history.length === 0) {
      alert("これ以上巻き戻せる操作履歴がありません。");
      return;
    }

    const previous = this.history.pop();
    this.nodes = previous.nodes;
    this.connections = previous.connections;
    this.groups = previous.groups || [];
    this.deselectAll();
    this.render();
    this.saveState();
  }

  // ==========================================
  // 4. イベントリスナー登録
  // ==========================================

  // ==========================================
  // タッチ・ピンチズーム・Apple Pencil 操作
  // ==========================================
  initTouchAndGestures() {
    let touchStartPan = { x: 0, y: 0 };
    let pinchStartDist = 0;
    let pinchStartZoom = 1.0;
    let isPinching = false;
    let isSingleTouchPanning = false;

    this.container.addEventListener("touchstart", (e) => {
      // 2本指ピンチズーム
      if (e.touches.length === 2) {
        isPinching = true;
        isSingleTouchPanning = false;
        this.isPanning = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchStartZoom = this.zoom;
        e.preventDefault();
        return;
      }

      // 1本指操作
      if (e.touches.length === 1) {
        const touch = e.touches[0];

        // Apple Pencil判定（iOS touchType === 'stylus'）
        if (touch.touchType === "stylus") {
          this.isUsingStylus = true;
          clearTimeout(this.stylusTimeout);
          this.stylusTimeout = setTimeout(() => { this.isUsingStylus = false; }, 800);
        } else if (this.isUsingStylus && (touch.radiusX > 25 || touch.radiusY > 25)) {
          // パームリジェクション: ペンシル使用中の手のひら誤タッチを無視
          return;
        }

        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (
          target && (
            target.closest(".mind-node") ||
            target.closest(".connector-handle") ||
            target.closest(".group-frame") ||
            target.closest("#connection-toolbar") ||
            target.closest(".canvas-controls") ||
            target.closest(".sidebar")
          )
        ) {
          return;
        }

        isSingleTouchPanning = true;
        this.isPanning = true;
        this.container.classList.add("panning");
        touchStartPan = { x: touch.clientX - this.pan.x, y: touch.clientY - this.pan.y };
        this.deselectAll();
      }
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      // 2本指ピンチズーム＆拡大縮小
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (pinchStartDist > 0) {
          const scale = newDist / pinchStartDist;
          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;
          const targetZoom = Math.min(2.5, Math.max(0.4, pinchStartZoom * scale));
          const rect = this.container.getBoundingClientRect();
          const mouseX = midX - rect.left;
          const mouseY = midY - rect.top;
          this.pan.x = mouseX - (mouseX - this.pan.x) * (targetZoom / this.zoom);
          this.pan.y = mouseY - (mouseY - this.pan.y) * (targetZoom / this.zoom);
          this.zoom = Math.round(targetZoom * 100) / 100;
          this.updateCanvasTransform();
          this.updateZoomDisplay();
        }
        return;
      }

      // 1本指キャンバススクロール（パン）
      if (isSingleTouchPanning && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        this.pan.x = touch.clientX - touchStartPan.x;
        this.pan.y = touch.clientY - touchStartPan.y;
        this.updateCanvasTransform();
        return;
      }

      // カードドラッグ移動（指またはApple Pencil）
      if (this.draggingNode && e.touches.length === 1) {
        e.preventDefault();
        this.hasDragged = true;
        const touch = e.touches[0];
        const mouse = this.getCanvasCoords(touch);
        this.draggingNode.x = Math.max(20, Math.round(mouse.x - this.dragOffset.x));
        this.draggingNode.y = Math.max(20, Math.round(mouse.y - this.dragOffset.y));
        this.updateNodePosition(this.draggingNode);
        this.renderConnections();
        return;
      }

      // コネクタ矢印引き（指またはApple Pencil）
      if (this.connectingSourceId && e.touches.length === 1) {
        e.preventDefault();
        this.updateDragLine(e.touches[0]);
        return;
      }

      // グループ枠ドラッグ移動
      if (this.draggingGroup && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouse = this.getCanvasCoords(touch);
        const newX = Math.round(mouse.x - this.groupDragOffset.x);
        const newY = Math.round(mouse.y - this.groupDragOffset.y);
        const deltaX = newX - this.draggingGroup.x;
        const deltaY = newY - this.draggingGroup.y;
        this.draggingGroup.x = newX;
        this.draggingGroup.y = newY;
        const el = document.getElementById(`dom-group-${this.draggingGroup.id}`);
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }
        this.groupMemberNodes.forEach(node => {
          node.x += deltaX;
          node.y += deltaY;
          this.updateNodePosition(node);
        });
        this.renderConnections();
        return;
      }

      // カードリサイズ
      if (this.resizingNode && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = (touch.clientX - this.startResize.clientX) / this.zoom;
        const deltaY = (touch.clientY - this.startResize.clientY) / this.zoom;
        const newWidth = Math.max(160, Math.round(this.startResize.startWidth + deltaX));
        this.resizingNode.width = newWidth;
        const el = document.getElementById(`dom-${this.resizingNode.id}`);
        if (el) el.style.width = `${newWidth}px`;
        if (!this.resizingNode.collapsed) {
          const newHeight = Math.max(70, Math.round(this.startResize.startHeight + deltaY));
          this.resizingNode.height = newHeight;
          if (el) {
            el.style.height = `${newHeight}px`;
            el.classList.add("has-custom-height");
          }
        }
        this.renderConnections();
        return;
      }
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      if (isPinching) {
        isPinching = false;
        this.saveState();
      }
      if (isSingleTouchPanning) {
        isSingleTouchPanning = false;
        this.isPanning = false;
        this.container.classList.remove("panning");
        this.saveState();
      }
      if (this.draggingNode) {
        if (this.hasDragged) {
          this.saveState();
        }
        this.draggingNode = null;
        this.hasDragged = false;
      }
      if (this.draggingGroup) {
        this.draggingGroup = null;
        this.groupMemberNodes = [];
        this.saveState();
      }
      if (this.resizingNode) {
        this.resizingNode = null;
        this.startResize = null;
        this.saveState();
      }
      if (this.connectingSourceId) {
        const touch = e.changedTouches ? e.changedTouches[0] : null;
        this.finishConnectionDrag(touch || e);
      }
    });

    window.addEventListener("touchcancel", () => {
      isPinching = false;
      isSingleTouchPanning = false;
      this.isPanning = false;
      this.container.classList.remove("panning");
      this.draggingNode = null;
      this.draggingGroup = null;
      this.resizingNode = null;
      if (this.connectingSourceId) {
        this.finishConnectionDrag(null);
      }
    });
  }

  bindEvents() {
    // ツールバー
    this.addTopdownBtn.addEventListener("click", () => this.addNewNode("topdown"));
    this.addBottomupBtn.addEventListener("click", () => this.addNewNode("bottomup"));
    this.addSynthesisBtn.addEventListener("click", () => this.addNewNode("synthesis"));
    if (this.addCustomBtn) {
      this.addCustomBtn.addEventListener("click", () => this.addNewNode("custom"));
    }
    if (this.addGroupBtn) {
      this.addGroupBtn.addEventListener("click", () => this.addNewGroup());
    }
    if (this.undoBtn) {
      this.undoBtn.addEventListener("click", () => this.undo());
    }

    // ハンバーガーメニュー開閉
    if (this.hamburgerMenuBtn && this.hamburgerDropdown) {
      this.hamburgerMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.hamburgerDropdown.classList.toggle("open");
      });
      this.hamburgerDropdown.addEventListener("click", (e) => {
        if (e.target.closest(".dropdown-item")) {
          this.hamburgerDropdown.classList.remove("open");
        }
      });
      document.addEventListener("click", (e) => {
        if (!this.hamburgerDropdown.contains(e.target) && !this.hamburgerMenuBtn.contains(e.target)) {
          this.hamburgerDropdown.classList.remove("open");
        }
      });
    }

    // ショートカットキー (Ctrl+Z / Cmd+Z)
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        // 入力フォーム編集中は標準のUndoを優先
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        this.undo();
      }
    });

    this.exportJsonBtn.addEventListener("click", () => this.exportToJsonFile());
    this.importJsonInput.addEventListener("change", (e) => this.importFromJsonFile(e));
    this.resetCanvasBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleResetClick();
    });

    this.zoomInBtn.addEventListener("click", () => this.adjustZoom(0.15));
    this.zoomOutBtn.addEventListener("click", () => this.adjustZoom(-0.15));
    this.zoomResetBtn.addEventListener("click", () => this.resetZoom());

    // キャンバス背景パン
    this.container.addEventListener("mousedown", (e) => {
      if (
        e.target.closest(".mind-node") ||
        e.target.closest(".connector-handle") ||
        e.target.closest("#connection-toolbar") ||
        e.target.closest(".connection-path")
      ) {
        return;
      }
      this.isPanning = true;
      this.container.classList.add("panning");
      this.startPan = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
      this.deselectAll();
    });

    window.addEventListener("mousemove", (e) => {
      if (this.resizingGroup) {
        const deltaX = (e.clientX - this.startGroupResize.clientX) / this.zoom;
        const deltaY = (e.clientY - this.startGroupResize.clientY) / this.zoom;
        const newW = Math.max(220, Math.round(this.startGroupResize.startW + deltaX));
        const newH = Math.max(120, Math.round(this.startGroupResize.startH + deltaY));
        this.resizingGroup.width = newW;
        this.resizingGroup.height = newH;
        const el = document.getElementById(`dom-group-${this.resizingGroup.id}`);
        if (el) {
          el.style.width = `${newW}px`;
          el.style.height = `${newH}px`;
        }
      } else if (this.draggingGroup) {
        const mouse = this.getCanvasCoords(e);
        const newX = Math.round(mouse.x - this.groupDragOffset.x);
        const newY = Math.round(mouse.y - this.groupDragOffset.y);
        const deltaX = newX - this.draggingGroup.x;
        const deltaY = newY - this.draggingGroup.y;
        this.draggingGroup.x = newX;
        this.draggingGroup.y = newY;
        const el = document.getElementById(`dom-group-${this.draggingGroup.id}`);
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }
        // 内包されているカードも一緒に連動移動！
        this.groupMemberNodes.forEach(node => {
          node.x += deltaX;
          node.y += deltaY;
          this.updateNodePosition(node);
        });
        this.renderConnections();
      } else if (this.resizingNode) {
        const deltaX = (e.clientX - this.startResize.clientX) / this.zoom;
        const deltaY = (e.clientY - this.startResize.clientY) / this.zoom;
        const newWidth = Math.max(160, Math.round(this.startResize.startWidth + deltaX));
        this.resizingNode.width = newWidth;
        const el = document.getElementById(`dom-${this.resizingNode.id}`);
        if (el) {
          el.style.width = `${newWidth}px`;
        }
        if (!this.resizingNode.collapsed) {
          const newHeight = Math.max(70, Math.round(this.startResize.startHeight + deltaY));
          this.resizingNode.height = newHeight;
          if (el) {
            el.style.height = `${newHeight}px`;
            el.classList.add("has-custom-height");
          }
        }
        this.renderConnections();
      } else if (this.isPanning) {
        this.pan.x = e.clientX - this.startPan.x;
        this.pan.y = e.clientY - this.startPan.y;
        this.updateCanvasTransform();
      } else if (this.draggingNode) {
        this.hasDragged = true;
        const mouse = this.getCanvasCoords(e);
        this.draggingNode.x = Math.max(20, Math.round(mouse.x - this.dragOffset.x));
        this.draggingNode.y = Math.max(20, Math.round(mouse.y - this.dragOffset.y));
        this.updateNodePosition(this.draggingNode);
        this.renderConnections();
      } else if (this.connectingSourceId) {
        this.updateDragLine(e);
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (this.resizingGroup) {
        this.resizingGroup = null;
        this.startGroupResize = null;
        this.saveState();
      }
      if (this.draggingGroup) {
        this.draggingGroup = null;
        this.groupMemberNodes = [];
        this.saveState();
      }
      if (this.resizingNode) {
        this.resizingNode = null;
        this.startResize = null;
        this.saveState();
      }
      if (this.isPanning) {
        this.isPanning = false;
        this.container.classList.remove("panning");
        this.saveState();
      }
      if (this.draggingNode) {
        if (this.hasDragged) {
          this.saveState();
        }
        this.draggingNode = null;
        this.hasDragged = false;
      }
      if (this.connectingSourceId) {
        this.finishConnectionDrag(e);
      }
    });

    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
      this.adjustZoom(zoomFactor);
    }, { passive: false });

    // ノート更新
    this.nodeTitleInput.addEventListener("input", () => this.updateSelectedNode("title", this.nodeTitleInput.value));
    this.nodeTypeSelect.addEventListener("change", () => this.updateSelectedNode("type", this.nodeTypeSelect.value));
    if (this.genreChips) {
      this.genreChips.forEach(chip => {
        chip.addEventListener("click", () => {
          const type = chip.dataset.type;
          this.updateSelectedNode("type", type);
        });
      });
    }
    if (this.nodeCustomNameInput) {
      this.nodeCustomNameInput.addEventListener("input", () => this.updateSelectedNode("customLabel", this.nodeCustomNameInput.value));
    }
    this.nodeStatusSelect.addEventListener("change", () => this.updateSelectedNode("status", this.nodeStatusSelect.value));
    this.nodeBodyInput.addEventListener("input", () => this.updateSelectedNode("body", this.nodeBodyInput.value));
    this.nodeTagsInput.addEventListener("input", () => this.updateSelectedNode("tags", this.nodeTagsInput.value));
    if (this.nodeGroupSelect) {
      this.nodeGroupSelect.addEventListener("change", () => {
        const val = this.nodeGroupSelect.value || null;
        this.updateSelectedNode("groupId", val);
      });
    }

    // ★削除ボタンを確実に実行
    this.deleteNodeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteSelectedNode();
    });
    this.closeNoteBtn.addEventListener("click", () => this.closeNoteSidebar());

    // AIサイドバー
    this.toggleAiBtn.addEventListener("click", () => this.toggleAiSidebar());
    this.closeAiBtn.addEventListener("click", () => this.aiSidebar.classList.remove("open"));

    this.tabAuto.addEventListener("click", () => {
      this.tabAuto.classList.add("active");
      this.tabManual.classList.remove("active");
      this.panelAuto.classList.add("active");
      this.panelManual.classList.remove("active");
    });

    this.tabManual.addEventListener("click", () => {
      this.tabManual.classList.add("active");
      this.tabAuto.classList.remove("active");
      this.panelManual.classList.add("active");
      this.panelAuto.classList.remove("active");
    });

    this.apiKeyInput.addEventListener("change", () => {
      localStorage.setItem("synapse_gemini_key", this.apiKeyInput.value.trim());
    });

    // 複数ファイル投入
    this.dropZone.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleMultipleFiles(e.target.files));
    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropZone.classList.add("dragover");
    });
    this.dropZone.addEventListener("dragleave", () => this.dropZone.classList.remove("dragover"));
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        this.handleMultipleFiles(e.dataTransfer.files);
      }
    });

    this.clearFilesBtn.addEventListener("click", () => this.clearAllAttachedFiles());

    this.runAiBtn.addEventListener("click", () => this.executeGeminiApi());
    this.copyPromptBtn.addEventListener("click", () => this.copyManualPrompt());
    this.applyManualResultBtn.addEventListener("click", () => this.applyManualJson());

    // 確認モーダルのイベント
    this.closeModalBtn.addEventListener("click", () => this.closePreviewModal());
    this.cancelPreviewBtn.addEventListener("click", () => this.closePreviewModal());
    this.addManualPreviewCardBtn.addEventListener("click", () => this.addCardToPreview());
    this.confirmPreviewBtn.addEventListener("click", () => this.confirmAndDeployCards());

    // 接続線編集ツールバーのイベント
    if (this.connToolbar) {
      this.connToolbar.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });

      this.connToolbar.addEventListener("click", (e) => {
        e.stopPropagation();
        const btn = e.target.closest("[data-action]");
        if (btn) {
          const action = btn.dataset.action;
          const val = btn.dataset.val;
          this.updateSelectedConnection(action, val);
        }
      });
    }

    if (this.connDeleteBtn) {
      this.connDeleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.selectedConnectionId) {
          this.deleteConnection(this.selectedConnectionId);
        }
      });
    }

    // プロジェクト保存・管理モーダルのイベント
    if (this.manageProjectsBtn) {
      this.manageProjectsBtn.addEventListener("click", () => this.openProjectsModal());
    }
    if (this.closeProjectsModalBtn) {
      this.closeProjectsModalBtn.addEventListener("click", () => this.closeProjectsModal());
    }
    if (this.closeProjectsBtn) {
      this.closeProjectsBtn.addEventListener("click", () => this.closeProjectsModal());
    }
    if (this.saveNewProjectBtn) {
      this.saveNewProjectBtn.addEventListener("click", () => this.handleSaveNewProject());
    }
    if (this.newProjectNameInput) {
      this.newProjectNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleSaveNewProject();
      });
    }

    // アカウント認証・クラウド同期のイベント
    if (this.authBtn) {
      this.authBtn.addEventListener("click", () => this.openAuthModal());
    }
    if (this.closeAuthModalBtn) {
      this.closeAuthModalBtn.addEventListener("click", () => this.closeAuthModal());
    }
    if (this.closeAuthBottomBtn) {
      this.closeAuthBottomBtn.addEventListener("click", () => this.closeAuthModal());
    }
    if (this.authTabLogin) {
      this.authTabLogin.addEventListener("click", () => this.switchAuthTab("login"));
    }
    if (this.authTabRegister) {
      this.authTabRegister.addEventListener("click", () => this.switchAuthTab("register"));
    }
    if (this.authSubmitBtn) {
      this.authSubmitBtn.addEventListener("click", () => this.handleAuthSubmit());
    }
    if (this.doLogoutBtn) {
      this.doLogoutBtn.addEventListener("click", () => this.handleLogout());
    }
    if (this.manualCloudPullBtn) {
      this.manualCloudPullBtn.addEventListener("click", () => this.pullFromCloud(true));
    }
    if (this.authPasswordInput) {
      this.authPasswordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleAuthSubmit();
      });
    }
    if (this.resendVerifyEmailBtn) {
      this.resendVerifyEmailBtn.addEventListener("click", () => this.handleResendVerificationEmail());
    }
    if (this.doDeleteAccountBtn) {
      this.doDeleteAccountBtn.addEventListener("click", () => this.handleDeleteAccount());
    }

    // 利用規約・免責事項モーダル
    if (this.openTosBtn && this.tosModal) {
      this.openTosBtn.addEventListener("click", () => {
        this.tosModal.style.display = "flex";
      });
    }
    if (this.closeTosModalBtn && this.tosModal) {
      this.closeTosModalBtn.addEventListener("click", () => {
        this.tosModal.style.display = "none";
      });
    }
    if (this.closeTosBottomBtn && this.tosModal) {
      this.closeTosBottomBtn.addEventListener("click", () => {
        this.tosModal.style.display = "none";
      });
    }
  }

  // ==========================================
  // 5. キャンバス操作
  // ==========================================
  adjustZoom(delta) {
    const newZoom = Math.min(1.8, Math.max(0.6, this.zoom + delta));
    this.zoom = Math.round(newZoom * 100) / 100;
    this.zoomLevelText.textContent = `${Math.round(this.zoom * 100)}%`;
    this.updateCanvasTransform();
    this.saveState();
  }

  resetZoom() {
    this.zoom = 1.0;
    this.pan = { x: 70, y: 30 };
    this.zoomLevelText.textContent = "100%";
    this.updateCanvasTransform();
    this.saveState();
  }

  updateCanvasTransform() {
    this.board.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  render() {
    this.renderGroups();
    this.renderNodes();
    this.renderConnections();
    this.updateEmptyState();
  }

  updateEmptyState() {
    if (this.emptyState) {
      this.emptyState.style.display = this.nodes.length === 0 ? "block" : "none";
    }
  }


  // カードの所属グループを変更
  setNodeGroup(nodeId, groupId) {
    this.pushHistory();
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    node.groupId = groupId;

    // もし所属したグループが現在折りたたまれていれば非表示にする
    const group = this.groups.find(g => g.id === groupId);
    if (group && group.collapsed) {
      node.hiddenByGroup = true;
    } else {
      node.hiddenByGroup = false;
    }

    this.render();
    this.saveState();
  }

  // 指定グループに所属しているカードを取得（色・所属連動型）
  getGroupMemberNodes(group) {
    return this.nodes.filter(node => node.groupId === group.id);
  }

  // グループ枠の追加（自由なカラーピッカー付き）
  addNewGroup() {
    this.pushHistory();

    const centerX = (-this.pan.x + this.container.clientWidth / 2) / this.zoom - 200;
    const centerY = (-this.pan.y + this.container.clientHeight / 2) / this.zoom - 140;

    const presetColors = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899", "#6366f1"];
    const randomColor = presetColors[this.groups.length % presetColors.length];

    const newGroup = {
      id: `group-${Date.now()}`,
      title: `グループ ${this.groups.length + 1}`,
      color: randomColor,
      x: Math.round(centerX),
      y: Math.round(centerY),
      width: 460,
      height: 320,
      collapsed: false
    };

    this.groups.push(newGroup);
    this.render();
    this.saveState();
  }

  deleteGroup(groupId) {
    this.pushHistory();
    // 削除時は所属していたカードを無所属に戻す
    this.nodes.forEach(n => {
      if (n.groupId === groupId) {
        n.groupId = null;
        n.hiddenByGroup = false;
      }
    });
    this.groups = this.groups.filter(g => g.id !== groupId);
    this.render();
    this.saveState();
  }

  toggleGroupCollapse(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    this.pushHistory();
    const willCollapse = !group.collapsed;
    group.collapsed = willCollapse;

    // グループ枠のヘッダー中央座標（吸い込み先）
    const targetX = group.x + group.width / 2;
    const targetY = group.y + 22;

    const memberNodes = this.nodes.filter(n => n.groupId === group.id);

    if (willCollapse) {
      // ★ 吸い込まれるアニメーション（現在位置からグループヘッダーへシュッと縮小移動）
      memberNodes.forEach(node => {
        const el = document.getElementById(`dom-${node.id}`);
        if (el) {
          const deltaX = targetX - (node.x + (node.width || 250) / 2);
          const deltaY = targetY - (node.y + 40);
          el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.12)`;
          el.classList.add("is-sucking");
        }
      });

      // アニメーション完了後に完全に非表示化＆再描画
      setTimeout(() => {
        memberNodes.forEach(node => {
          node.hiddenByGroup = true;
          const el = document.getElementById(`dom-${node.id}`);
          if (el) {
            el.style.display = "none";
            el.style.transform = "";
            el.classList.remove("is-sucking");
          }
        });
        this.render();
        this.renderConnections();
        this.saveState();
      }, 300);
    } else {
      // ★ 飛び出すアニメーション（グループヘッダーからポンッと広がる）
      memberNodes.forEach(node => {
        node.hiddenByGroup = false;
        const el = document.getElementById(`dom-${node.id}`);
        if (el) {
          el.style.display = "block";
          const deltaX = targetX - (node.x + (node.width || 250) / 2);
          const deltaY = targetY - (node.y + 40);
          el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.12)`;
          el.style.opacity = "0";

          // 次のフレームで元の位置へ拡大
          requestAnimationFrame(() => {
            el.style.transform = "translate(0px, 0px) scale(1)";
            el.style.opacity = "1";
          });
        }
      });

      setTimeout(() => {
        memberNodes.forEach(node => {
          const el = document.getElementById(`dom-${node.id}`);
          if (el) {
            el.style.transform = "";
            el.style.opacity = "";
          }
        });
        this.render();
        this.renderConnections();
        this.saveState();
      }, 320);
    }
  }

  renderGroups() {
    if (!this.groupsContainer) return;
    this.groupsContainer.innerHTML = "";

    this.groups.forEach(group => {
      const el = document.createElement("div");
      el.className = `mind-group ${group.collapsed ? "is-collapsed" : ""}`;
      el.id = `dom-group-${group.id}`;
      el.style.left = `${group.x}px`;
      el.style.top = `${group.y}px`;
      el.style.width = `${group.width}px`;
      if (!group.collapsed) {
        el.style.height = `${group.height}px`;
      }

      // グループの枠色・背景色の動的反映
      el.style.borderColor = group.color || "#3b82f6";
      el.style.backgroundColor = `${group.color || "#3b82f6"}18`; // 10%前後の透明度

      // 所属カード枚数
      const members = this.getGroupMemberNodes(group);
      const memberCount = members.length;

      // ヘッダー
      const header = document.createElement("div");
      header.className = "group-header";
      header.style.borderLeft = `5px solid ${group.color || "#3b82f6"}`;

      // タイトル入力（直接編集可能）
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "group-title-input";
      titleInput.value = group.title;
      titleInput.placeholder = "グループ名を入力...";
      titleInput.title = "クリックしてグループ名を編集";
      titleInput.addEventListener("mousedown", (e) => e.stopPropagation());
      titleInput.addEventListener("input", (e) => {
        group.title = e.target.value;
        this.saveState();
        // サイドバーのドロップダウン等も再描画
        if (this.nodeGroupSelect && this.selectedNodeId) {
          const opt = this.nodeGroupSelect.querySelector(`option[value="${group.id}"]`);
          if (opt) opt.textContent = `${group.title} (${group.color})`;
        }
      });

      // 操作ボタングループ
      const actions = document.createElement("div");
      actions.className = "group-actions";

      // プリセット色ドット
      const colorPicker = document.createElement("div");
      colorPicker.className = "group-color-picker";
      ["#3b82f6", "#10b981", "#f97316", "#a855f7"].forEach(hex => {
        const dot = document.createElement("span");
        dot.className = "group-color-dot";
        dot.style.backgroundColor = hex;
        dot.title = "この色に変更";
        dot.addEventListener("mousedown", (e) => e.stopPropagation());
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          group.color = hex;
          this.render();
          this.saveState();
        });
        colorPicker.appendChild(dot);
      });

      // ★ グラデーションマップ風カラーピッカー（自由色選択）
      const colorInputWrap = document.createElement("div");
      colorInputWrap.className = "group-color-input-wrapper";
      colorInputWrap.title = "グラデーションマップから好きな色を自由に選ぶ";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = group.color || "#3b82f6";
      colorInput.addEventListener("mousedown", (e) => e.stopPropagation());
      colorInput.addEventListener("input", (e) => {
        e.stopPropagation();
        group.color = e.target.value;
        el.style.borderColor = group.color;
        el.style.backgroundColor = `${group.color}18`;
        header.style.borderLeftColor = group.color;
        this.renderNodes(); // カードの左側ボーダー色もリアルタイム反映
        this.saveState();
      });
      colorInputWrap.appendChild(colorInput);
      colorPicker.appendChild(colorInputWrap);

      // 展開/収納ボタン
      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.className = "group-btn-collapse";
      collapseBtn.innerHTML = group.collapsed 
        ? `<span>📁 展開 (${memberCount}枚)</span>` 
        : `<span>📂 収納 (${memberCount}枚)</span>`;
      collapseBtn.addEventListener("mousedown", (e) => e.stopPropagation());
      collapseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleGroupCollapse(group.id);
      });

      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "group-btn-delete";
      delBtn.innerHTML = "✕";
      delBtn.title = "このグループ枠を削除";
      delBtn.addEventListener("mousedown", (e) => e.stopPropagation());
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteGroup(group.id);
      });

      actions.appendChild(colorPicker);
      actions.appendChild(collapseBtn);
      actions.appendChild(delBtn);

      header.appendChild(titleInput);
      header.appendChild(actions);
      el.appendChild(header);

      // ★ 収納時に箱の中にタイトルだけの帯を整列して表示するコンテナ
      const collapsedItemsContainer = document.createElement("div");
      collapsedItemsContainer.className = "group-collapsed-items";

      if (group.collapsed) {
        collapsedItemsContainer.style.display = "flex";
        if (members.length === 0) {
          collapsedItemsContainer.innerHTML = '<div style="color:#9ca3af; font-size:0.7rem; padding:4px 8px;">(所属カードなし)</div>';
        } else {
          members.forEach(mNode => {
            const item = document.createElement("div");
            item.className = `group-collapsed-item genre-${mNode.type || "topdown"}`;
            item.title = "クリックしてこのカードを選択";

            const genreLabels = {
              topdown: "問い・仮説",
              bottomup: "知見・メモ",
              synthesis: "検証・合流",
              custom: mNode.customLabel || "その他"
            };

            item.innerHTML = `
              <span class="collapsed-genre-badge">${this.escapeHtml(genreLabels[mNode.type] || "メモ")}</span>
              <span class="collapsed-item-title">${this.escapeHtml(mNode.title || "（無題のカード）")}</span>
            `;

            item.addEventListener("mousedown", (e) => e.stopPropagation());
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              // クリックしたカードを選択してノート編集を開く
              this.selectNode(mNode.id);
            });

            collapsedItemsContainer.appendChild(item);
          });
        }
      } else {
        collapsedItemsContainer.style.display = "none";
      }

      el.appendChild(collapsedItemsContainer);

      // リサイズハンドル
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "group-resize-handle";
      resizeHandle.title = "ドラッグしてグループ枠の大きさを変更";
      resizeHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.pushHistory();
        this.resizingGroup = group;
        this.startGroupResize = {
          clientX: e.clientX,
          clientY: e.clientY,
          startW: group.width,
          startH: group.height
        };
      });
      resizeHandle.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        e.preventDefault();
        const touch = e.touches[0];
        this.pushHistory();
        this.resizingGroup = group;
        this.startGroupResize = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          startW: group.width,
          startH: group.height
        };
      }, { passive: false });
      el.appendChild(resizeHandle);

      // ヘッダードラッグでグループ移動＋所属カードも一緒に連動移動
      header.addEventListener("mousedown", (e) => {
        if (e.target.closest("input") || e.target.closest("button") || e.target.closest(".group-color-dot") || e.target.closest(".group-color-input-wrapper")) return;
        e.stopPropagation();
        this.pushHistory();
        this.draggingGroup = group;
        this.groupMemberNodes = this.getGroupMemberNodes(group);
        const mouse = this.getCanvasCoords(e);
        this.groupDragOffset = {
          x: mouse.x - group.x,
          y: mouse.y - group.y
        };
      });
      header.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        if (e.target.closest("input") || e.target.closest("button") || e.target.closest(".group-color-dot") || e.target.closest(".group-color-input-wrapper")) return;
        e.stopPropagation();
        const touch = e.touches[0];
        this.pushHistory();
        this.draggingGroup = group;
        this.groupMemberNodes = this.getGroupMemberNodes(group);
        const mouse = this.getCanvasCoords(touch);
        this.groupDragOffset = {
          x: mouse.x - group.x,
          y: mouse.y - group.y
        };
      }, { passive: true });

      // ヘッダーダブルクリックでも折りたたみ可能
      header.addEventListener("dblclick", (e) => {
        if (e.target.closest("input") || e.target.closest("button")) return;
        e.stopPropagation();
        this.toggleGroupCollapse(group.id);
      });

      this.groupsContainer.appendChild(el);
    });
  }
  // ==========================================
  // 6. ノード描画・操作 ＆ クイック削除
  // ==========================================
  renderNodes() {
    this.nodesContainer.innerHTML = "";
    this.nodes.forEach(node => {
      // ★ 所属グループが収納中（collapsed）のカードはキャンバス上には描画せず箱の中に収める！
      const parentGroup = this.groups.find(g => g.id === node.groupId);
      if (parentGroup && parentGroup.collapsed) return;
      if (node.hiddenByGroup) return;

      const el = document.createElement("div");
      el.className = `mind-node node-${node.type} ${this.selectedNodeId === node.id ? "selected" : ""} ${node.collapsed ? "is-collapsed" : ""}`;
      el.id = `dom-${node.id}`;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      if (node.width) el.style.width = `${node.width}px`;
      if (node.height) {
        el.style.height = `${node.height}px`;
        el.classList.add("has-custom-height");
      }

      // クイック削除ボタン「✕」
      const quickDel = document.createElement("button");
      quickDel.className = "node-quick-delete";
      quickDel.title = "このカードを削除";
      quickDel.innerHTML = "✕";
      quickDel.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteNodeById(node.id);
      });

      // 右下リサイズハンドル
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "node-resize-handle";
      resizeHandle.title = "ドラッグしてカードの大きさを変更";
      resizeHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.pushHistory();
        this.resizingNode = node;
        this.startResize = {
          clientX: e.clientX,
          clientY: e.clientY,
          startWidth: el.offsetWidth,
          startHeight: el.offsetHeight
        };
      });
      resizeHandle.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        e.preventDefault();
        const touch = e.touches[0];
        this.pushHistory();
        this.resizingNode = node;
        this.startResize = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          startWidth: el.offsetWidth,
          startHeight: el.offsetHeight
        };
      }, { passive: false });

      // 上部コネクタ
      const topHandle = document.createElement("div");
      topHandle.className = "connector-handle connector-top";
      topHandle.dataset.port = "top";
      topHandle.title = "ドラッグして他のカードと線をつなぐ";
      topHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startConnectionDrag(node.id, e);
      });
      topHandle.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        e.preventDefault();
        this.startConnectionDrag(node.id, e.touches[0]);
      }, { passive: false });

      // 下部コネクタ
      const bottomHandle = document.createElement("div");
      bottomHandle.className = "connector-handle connector-bottom";
      bottomHandle.dataset.port = "bottom";
      bottomHandle.title = "ドラッグして他のカードと線をつなぐ";
      bottomHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startConnectionDrag(node.id, e);
      });
      bottomHandle.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        e.preventDefault();
        this.startConnectionDrag(node.id, e.touches[0]);
      }, { passive: false });

      // 左部コネクタ
      const leftHandle = document.createElement("div");
      leftHandle.className = "connector-handle connector-left";
      leftHandle.dataset.port = "left";
      leftHandle.title = "ドラッグして他のカードと線をつなぐ";
      leftHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startConnectionDrag(node.id, e);
      });
      leftHandle.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        e.preventDefault();
        this.startConnectionDrag(node.id, e.touches[0]);
      }, { passive: false });

      // 右部コネクタ
      const rightHandle = document.createElement("div");
      rightHandle.className = "connector-handle connector-right";
      rightHandle.dataset.port = "right";
      rightHandle.title = "ドラッグして他のカードと線をつなぐ";
      rightHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startConnectionDrag(node.id, e);
      });
      rightHandle.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        e.preventDefault();
        this.startConnectionDrag(node.id, e.touches[0]);
      }, { passive: false });

      let typeLabel = "Top-down (問い・仮説)";
      if (node.type === "bottomup") {
        typeLabel = "Bottom-up (知見・メモ)";
      } else if (node.type === "synthesis") {
        typeLabel = "Synthesis (検証・合流)";
      } else if (node.type === "custom") {
        typeLabel = `Custom (${node.customLabel || "その他"})`;
      }

      const assignedGroup = this.groups.find(g => g.id === node.groupId);
      if (assignedGroup) {
        el.classList.add("has-group");
        el.style.borderLeftColor = assignedGroup.color || "#3b82f6";
      } else {
        el.style.borderLeftColor = "";
      }

      // グループ枠が1つ以上ある時だけ、ただのカラー丸ぽちをシンプルに並べる（文字なし）
      let groupDotsHtml = "";
      if (this.groups.length > 0) {
        groupDotsHtml += `<div class="node-group-dots-bar">`;
        // 白のぽち（無所属）
        groupDotsHtml += `<button type="button" class="node-group-dot-btn is-none ${!node.groupId ? "is-active" : ""}" data-group-id="" title="無所属（白）"></button>`;
        // 各グループのカラー丸ぽち
        this.groups.forEach(g => {
          const isActive = node.groupId === g.id;
          groupDotsHtml += `<button type="button" class="node-group-dot-btn ${isActive ? "is-active" : ""}" data-group-id="${g.id}" style="background-color: ${g.color};" title="${this.escapeHtml(g.title)}"></button>`;
        });
        groupDotsHtml += `</div>`;
      }

      el.innerHTML = `
        <div class="node-header">
          <span class="node-badge" title="クリックで折りたたみ / 展開">${typeLabel}</span>
          <span class="node-status-dot status-${node.status}"></span>
        </div>
        <div class="node-title">${this.escapeHtml(node.title)}</div>
        <div class="node-snippet">${this.escapeHtml(node.body || "（詳細ノートなし）")}</div>
        ${groupDotsHtml}
      `;

      el.appendChild(quickDel);
      el.appendChild(resizeHandle);
      el.appendChild(topHandle);
      el.appendChild(bottomHandle);
      el.appendChild(leftHandle);
      el.appendChild(rightHandle);

      // ★ カラー丸ぽちクリックで即座にグループ所属切り替え！
      const dotBtns = el.querySelectorAll(".node-group-dot-btn");
      dotBtns.forEach(btn => {
        btn.addEventListener("mousedown", (e) => e.stopPropagation());
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetGid = btn.dataset.groupId || null;
          this.setNodeGroup(node.id, targetGid);
        });
      });

      // バッジをクリックした時に折りたたみ・展開をトグル
      const badgeEl = el.querySelector(".node-badge");
      if (badgeEl) {
        badgeEl.addEventListener("mousedown", (e) => {
          e.stopPropagation();
        });
        badgeEl.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleNodeCollapse(node.id);
        });
      }

      el.addEventListener("mousedown", (e) => {
        if (
          e.target.closest(".connector-handle") ||
          e.target.closest(".node-quick-delete") ||
          e.target.closest(".node-resize-handle") ||
          e.target.closest(".node-badge") ||
          e.target.closest(".node-group-dot-btn")
        ) return;
        e.stopPropagation();
        this.selectNode(node.id);

        this.pushHistory(); // 移動前のスナップショット
        this.draggingNode = node;
        this.hasDragged = false;
        const mouse = this.getCanvasCoords(e);
        this.dragOffset = {
          x: mouse.x - node.x,
          y: mouse.y - node.y
        };
      });

      el.addEventListener("touchstart", (e) => {
        if (e.touches.length > 1) return;
        if (
          e.target.closest(".connector-handle") ||
          e.target.closest(".node-quick-delete") ||
          e.target.closest(".node-resize-handle") ||
          e.target.closest(".node-badge") ||
          e.target.closest(".node-group-dot-btn")
        ) return;
        e.stopPropagation();
        const touch = e.touches[0];
        this.selectNode(node.id);

        this.pushHistory();
        this.draggingNode = node;
        this.hasDragged = false;
        const mouse = this.getCanvasCoords(touch);
        this.dragOffset = {
          x: mouse.x - node.x,
          y: mouse.y - node.y
        };
      }, { passive: true });

      this.nodesContainer.appendChild(el);
    });
  }

  updateNodePosition(node) {
    const el = document.getElementById(`dom-${node.id}`);
    if (el) {
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
    }
  }

  toggleNodeCollapse(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    this.pushHistory();
    node.collapsed = !node.collapsed;

    const el = document.getElementById(`dom-${node.id}`);
    if (el) {
      if (node.collapsed) {
        el.classList.add("is-collapsed");
      } else {
        el.classList.remove("is-collapsed");
      }
    }

    this.renderConnections();
    this.saveState();
  }

  addNewNode(type) {
    this.pushHistory();

    const centerX = (-this.pan.x + this.container.clientWidth / 2) / this.zoom - 125;
    let targetY = (-this.pan.y + this.container.clientHeight / 2) / this.zoom;

    if (type === "topdown") targetY = Math.max(60, targetY - 140);
    if (type === "bottomup") targetY = targetY + 140;
    if (type === "custom") targetY = targetY + 180;

    const id = `node-${Date.now()}`;
    const defaultTitles = {
      topdown: "新規の問い・仮説",
      bottomup: "新規の知見・メモ",
      synthesis: "新規の検証結果",
      custom: "新規メモ・課題"
    };

    const newNode = {
      id,
      type,
      customLabel: type === "custom" ? "その他" : "",
      title: defaultTitles[type] || "新規ノード",
      body: "",
      status: "idea",
      tags: "",
      x: Math.round(centerX),
      y: Math.round(targetY)
    };

    this.nodes.push(newNode);
    this.render();
    this.selectNode(newNode.id);
    this.saveState();
  }

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    this.selectedConnectionId = null;
    this.hideConnectionToolbar();

    document.querySelectorAll(".mind-node").forEach(el => el.classList.remove("selected"));
    const activeEl = document.getElementById(`dom-${nodeId}`);
    if (activeEl) activeEl.classList.add("selected");

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;

    this.noteSidebar.classList.add("open");
    this.noteEmptyState.style.display = "none";
    this.noteActiveContent.style.display = "block";

    this.nodeTitleInput.value = node.title || "";
    this.nodeTypeSelect.value = node.type;
    this.updateActiveGenreChip(node.type);
    this.nodeStatusSelect.value = node.status;
    this.nodeBodyInput.value = node.body || "";
    this.nodeTagsInput.value = node.tags || "";

    // 所属グループドロップダウンの更新（青丸などを左側に・英語除去）
    if (this.nodeGroupSelect) {
      this.nodeGroupSelect.innerHTML = '<option value="">⚪ 無所属</option>';
      const getEmojiForColor = (color) => {
        if (!color) return "🔵";
        const c = color.toLowerCase();
        if (c.includes("blue") || c === "#3b82f6" || c === "#2563eb" || c.includes("2d4f7c")) return "🔵";
        if (c.includes("green") || c === "#10b981" || c === "#4ade80") return "🟢";
        if (c.includes("orange") || c === "#f97316" || c === "#fb923c") return "🟠";
        if (c.includes("purple") || c === "#a855f7" || c === "#c084fc") return "🟣";
        if (c.includes("pink") || c === "#ec4899") return "🌸";
        if (c.includes("red") || c === "#ef4444") return "🔴";
        return "🎨";
      };

      this.groups.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.id;
        const emoji = getEmojiForColor(g.color);
        opt.textContent = `${emoji} ${g.title}`;
        if (node.groupId === g.id) opt.selected = true;
        this.nodeGroupSelect.appendChild(opt);
      });
    }

    const typeNames = {
      topdown: "問い・仮説 (Top-down)",
      bottomup: "知見・メモ (Bottom-up)",
      synthesis: "検証・合流 (Synthesis)",
      custom: `その他・自由設定 (${node.customLabel || "その他"})`
    };
    this.noteTypeBadge.textContent = typeNames[node.type] || "詳細ノート";

    if (this.nodeCustomNameGroup && this.nodeCustomNameInput) {
      if (node.type === "custom") {
        this.nodeCustomNameGroup.style.display = "block";
        this.nodeCustomNameInput.value = node.customLabel || "その他";
      } else {
        this.nodeCustomNameGroup.style.display = "none";
      }
    }
  }

  updateActiveGenreChip(type) {
    if (this.genreChips) {
      this.genreChips.forEach(chip => {
        chip.classList.toggle("active", chip.dataset.type === type);
      });
    }
    if (this.nodeTypeSelect) {
      this.nodeTypeSelect.value = type;
    }
  }

  deselectAll() {
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
    this.hideConnectionToolbar();
    document.querySelectorAll(".mind-node").forEach(el => el.classList.remove("selected"));
    document.querySelectorAll(".connection-path").forEach(el => el.classList.remove("selected"));
    this.noteEmptyState.style.display = "flex";
    this.noteActiveContent.style.display = "none";
    this.noteTypeBadge.textContent = "未選択";
    if (this.nodeCustomNameGroup) {
      this.nodeCustomNameGroup.style.display = "none";
    }
  }

  updateSelectedNode(field, value) {
    if (!this.selectedNodeId) return;
    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!node) return;

    node[field] = value;
    this.saveState();

    const el = document.getElementById(`dom-${node.id}`);
    if (el) {
      if (field === "title") {
        const titleEl = el.querySelector(".node-title");
        if (titleEl) titleEl.textContent = value || "（無題）";
      } else if (field === "body") {
        const snippetEl = el.querySelector(".node-snippet");
        if (snippetEl) snippetEl.textContent = value || "（詳細ノートなし）";
      } else if (field === "status") {
        const dot = el.querySelector(".node-status-dot");
        if (dot) dot.className = `node-status-dot status-${value}`;
      } else if (field === "type") {
        this.updateActiveGenreChip(value);
        el.className = `mind-node node-${value} selected ${node.height ? "has-custom-height" : ""}`;
        const badge = el.querySelector(".node-badge");
        if (badge) {
          badge.textContent = value === "topdown" ? "Top-down (問い・仮説)" :
                              value === "bottomup" ? "Bottom-up (知見・メモ)" :
                              value === "synthesis" ? "Synthesis (検証・合流)" :
                              `Custom (${node.customLabel || "その他"})`;
        }
        if (this.nodeCustomNameGroup && this.nodeCustomNameInput) {
          this.nodeCustomNameGroup.style.display = value === "custom" ? "block" : "none";
          if (value === "custom" && !node.customLabel) {
            node.customLabel = "その他";
            this.nodeCustomNameInput.value = "その他";
          }
        }
        const typeNames = {
          topdown: "問い・仮説 (Top-down)",
          bottomup: "知見・メモ (Bottom-up)",
          synthesis: "検証・合流 (Synthesis)",
          custom: `その他・自由設定 (${node.customLabel || "その他"})`
        };
        this.noteTypeBadge.textContent = typeNames[value] || "詳細ノート";
        this.renderConnections();
      } else if (field === "customLabel") {
        const badge = el.querySelector(".node-badge");
        if (badge && node.type === "custom") {
          badge.textContent = `Custom (${value || "その他"})`;
        }
        this.noteTypeBadge.textContent = `その他・自由設定 (${value || "その他"})`;
      } else if (field === "groupId") {
        this.setNodeGroup(node.id, value);
      }
    }
  }

  // ★確実にカードを削除する処理
  deleteSelectedNode() {
    if (!this.selectedNodeId) return;
    this.deleteNodeById(this.selectedNodeId);
  }

  deleteNodeById(nodeId) {
    this.pushHistory();

    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(c => c.from !== nodeId && c.to !== nodeId);

    if (this.selectedNodeId === nodeId) {
      this.deselectAll();
      this.closeNoteSidebar();
    }

    this.render();
    this.saveState();
  }

  closeNoteSidebar() {
    this.noteSidebar.classList.remove("open");
  }

  // ==========================================
  // 7. 接続線描画 ＆ 右クリック解除・スタイル変更
  // ==========================================
  // 各ノードの指定ポートの座標と外向き法線ベクトルを取得
  getNodePortCoord(node, port = "bottom", clearance = 7) {
    const el = document.getElementById(`dom-${node.id}`);
    const w = el ? el.offsetWidth : (node.width || 250);
    const h = el ? el.offsetHeight : (node.height || 96);
    const cx = node.x + w / 2;
    const cy = node.y + h / 2;

    switch (port) {
      case "top":
        return { x: cx, y: node.y - clearance, nx: 0, ny: -1 };
      case "bottom":
        return { x: cx, y: node.y + h + clearance, nx: 0, ny: 1 };
      case "left":
        return { x: node.x - clearance, y: cy, nx: -1, ny: 0 };
      case "right":
        return { x: node.x + w + clearance, y: cy, nx: 1, ny: 0 };
      default:
        return { x: cx, y: node.y + h + clearance, nx: 0, ny: 1 };
    }
  }

  renderConnections() {
    // ★ defs内のマーカー部品を保護し、描画された接続線のみをピンポイントで削除
    const paths = this.connectionsSvg.querySelectorAll(".connection-path, .connection-hit-path");
    paths.forEach(p => p.remove());

    this.connections.forEach(conn => {
      const fromNode = this.nodes.find(n => n.id === conn.from);
      const toNode = this.nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return;

      // 収納中グループのカードに繋がる矢印は非表示
      const fromGroup = this.groups.find(g => g.id === fromNode.groupId);
      const toGroup = this.groups.find(g => g.id === toNode.groupId);
      if ((fromGroup && fromGroup.collapsed) || (toGroup && toGroup.collapsed)) return;
      if (fromNode.hiddenByGroup || toNode.hiddenByGroup) return;

      // ★ 矢印の生える場所（ポート）はカード位置を変えても固定！
      // 過去データや未設定の場合はデフォルトで bottom -> top
      const fromPort = conn.fromPort || "bottom";
      const toPort = conn.toPort || "top";

      const p1 = this.getNodePortCoord(fromNode, fromPort);
      const p2 = this.getNodePortCoord(toNode, toPort);

      const startX = p1.x;
      const startY = p1.y;
      const endX = p2.x;
      const endY = p2.y;

      // 2点間の距離と相対ベクトル
      const dx = endX - startX;
      const dy = endY - startY;
      const dist = Math.hypot(dx, dy);

      // ポートの外向き法線方向に沿って曲線が自然に張り出すテンション
      const tension = Math.min(220, Math.max(40, dist * 0.45));

      // 制御点1: 始点ポートの法線ベクトル方向へ伸ばす
      const c1X = startX + p1.nx * tension;
      const c1Y = startY + p1.ny * tension;

      // 制御点2: 終点ポートの法線ベクトル方向へ伸ばす
      const c2X = endX + p2.nx * tension;
      const c2Y = endY + p2.ny * tension;

      // 線の形状（曲線 curve か 直線 straight か）
      const shape = conn.shape || "curve";
      let pathData = "";

      // ほぼ真っ直ぐ並んでいるかどうかの判定（エイムアシスト直線化）
      const isHorizontalAligned = Math.abs(dy) < 16 && (fromPort === "right" && toPort === "left" || fromPort === "left" && toPort === "right");
      const isVerticalAligned = Math.abs(dx) < 16 && (fromPort === "bottom" && toPort === "top" || fromPort === "top" && toPort === "bottom");

      if (shape === "straight" || isHorizontalAligned || isVerticalAligned) {
        // 完全な直線矢印
        pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        // 滑らかなベジェ曲線
        pathData = `M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}`;
      }

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);

      // デフォルト値のフォールバック
      const style = conn.style || "solid";
      const arrow = conn.arrow || "forward";
      const width = conn.width || "normal";
      const color = conn.color || "default";

      const isSelected = this.selectedConnectionId === conn.id;
      path.setAttribute("class", `connection-path style-${style} width-${width} color-${color} ${isSelected ? "selected" : ""}`);

      // 矢印マーカー設定（各色・双方向対応）
      if (arrow === "forward") {
        path.setAttribute("marker-end", `url(#arrow-${color})`);
      } else if (arrow === "both") {
        path.setAttribute("marker-start", `url(#arrow-start-${color})`);
        path.setAttribute("marker-end", `url(#arrow-${color})`);
      } else {
        path.removeAttribute("marker-end");
        path.removeAttribute("marker-start");
      }

      // ★ クリックしやすい透明なヒットエリア（幅18px）
      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.setAttribute("d", pathData);
      hitPath.setAttribute("class", "connection-hit-path");
      hitPath.setAttribute("stroke", "transparent");
      hitPath.setAttribute("stroke-width", "18");
      hitPath.setAttribute("fill", "none");
      hitPath.setAttribute("style", "cursor: pointer; pointer-events: stroke;");

      const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.deleteConnection(conn.id);
      };

      const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectConnection(conn, e);
      };

      // 本線とヒットエリアの両方にイベントを設定（シングルクリック・ダブルクリック両対応）
      hitPath.addEventListener("contextmenu", handleContextMenu);
      hitPath.addEventListener("click", handleClick);
      hitPath.addEventListener("dblclick", handleClick);

      path.addEventListener("contextmenu", handleContextMenu);
      path.addEventListener("click", handleClick);
      path.addEventListener("dblclick", handleClick);

      this.connectionsSvg.appendChild(hitPath);
      this.connectionsSvg.appendChild(path);
    });
  }

  selectConnection(conn, e) {
    this.selectedConnectionId = conn.id;
    this.selectedNodeId = null;
    this.closeNoteSidebar();

    // クリック位置（キャンバス内の相対座標）
    if (e) {
      const rect = this.container.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.pan.x) / this.zoom;
      const mouseY = (e.clientY - rect.top - this.pan.y) / this.zoom;

      if (this.connToolbar) {
        this.connToolbar.style.left = `${mouseX}px`;
        this.connToolbar.style.top = `${mouseY}px`;
      }
    }

    if (this.connToolbar) {
      this.connToolbar.style.display = "flex";
      this.updateConnectionToolbarActiveButtons(conn);
    }

    this.renderConnections();
  }

  updateConnectionToolbarActiveButtons(conn) {
    if (!this.connToolbar) return;

    const style = conn.style || "solid";
    const arrow = conn.arrow || "forward";
    const width = conn.width || "normal";
    const color = conn.color || "default";

    // ボタングループのactiveクラス更新
    this.connToolbar.querySelectorAll("[data-action]").forEach(btn => {
      const action = btn.dataset.action;
      const val = btn.dataset.val;
      let active = false;

      const shape = conn.shape || "curve";
      if (action === "shape" && val === shape) active = true;
      if (action === "style" && val === style) active = true;
      if (action === "arrow" && val === arrow) active = true;
      if (action === "width" && val === width) active = true;
      if (action === "color" && val === color) active = true;

      if (active) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  updateSelectedConnection(action, val) {
    if (!this.selectedConnectionId) return;
    const conn = this.connections.find(c => c.id === this.selectedConnectionId);
    if (!conn) return;

    this.pushHistory();
    conn[action] = val;
    this.renderConnections();
    this.updateConnectionToolbarActiveButtons(conn);
    this.saveState();
  }

  deleteConnection(connId) {
    this.pushHistory();
    this.connections = this.connections.filter(c => c.id !== connId);
    if (this.selectedConnectionId === connId) {
      this.hideConnectionToolbar();
    }
    this.renderConnections();
    this.saveState();
  }

  hideConnectionToolbar() {
    this.selectedConnectionId = null;
    if (this.connToolbar) {
      this.connToolbar.style.display = "none";
    }
    document.querySelectorAll(".connection-path").forEach(el => el.classList.remove("selected"));
  }

  startConnectionDrag(nodeId, e) {
    this.connectingSourceId = nodeId;
    const fromNode = this.nodes.find(n => n.id === nodeId);
    if (!fromNode) return;

    // クリックされたハンドルから生えるポート（top, bottom, left, right）を記録
    let port = "bottom";
    if (e && e.target) {
      if (e.target.dataset.port) {
        port = e.target.dataset.port;
      } else if (e.target.classList.contains("connector-top")) {
        port = "top";
      } else if (e.target.classList.contains("connector-bottom")) {
        port = "bottom";
      } else if (e.target.classList.contains("connector-left")) {
        port = "left";
      } else if (e.target.classList.contains("connector-right")) {
        port = "right";
      }
    }
    this.connectingSourcePort = port;

    this.dragLine.style.display = "block";
    const mouse = this.getCanvasCoords(e);

    this.dragLine.setAttribute("x1", mouse.x);
    this.dragLine.setAttribute("y1", mouse.y);
    this.dragLine.setAttribute("x2", mouse.x);
    this.dragLine.setAttribute("y2", mouse.y);
  }

  updateDragLine(e) {
    const mouse = this.getCanvasCoords(e);

    // ★ エイムアシスト（近接ポートへのマグネット吸着）
    let nearestPort = null;
    let minDistance = 38; // 吸着する半径（px）

    document.querySelectorAll(".connector-handle.aim-assist-target").forEach(el => {
      el.classList.remove("aim-assist-target");
    });

    for (const node of this.nodes) {
      if (node.id === this.connectingSourceId || node.hiddenByGroup) continue;

      ["top", "bottom", "left", "right"].forEach(port => {
        const coord = this.getNodePortCoord(node, port);
        const d = Math.hypot(mouse.x - coord.x, mouse.y - coord.y);
        if (d < minDistance) {
          minDistance = d;
          nearestPort = {
            nodeId: node.id,
            port: port,
            x: coord.x,
            y: coord.y
          };
        }
      });
    }

    if (nearestPort) {
      // 磁石のようにピタッと吸着！
      this.aimSnappedPort = nearestPort;
      this.dragLine.setAttribute("x2", nearestPort.x);
      this.dragLine.setAttribute("y2", nearestPort.y);

      // 対象のコネクタハンドルをハイライト
      const targetEl = document.getElementById(`dom-${nearestPort.nodeId}`);
      if (targetEl) {
        const handle = targetEl.querySelector(`.connector-${nearestPort.port}`);
        if (handle) handle.classList.add("aim-assist-target");
      }
    } else {
      this.aimSnappedPort = null;
      this.dragLine.setAttribute("x2", mouse.x);
      this.dragLine.setAttribute("y2", mouse.y);
    }
  }

  finishConnectionDrag(e) {
    this.dragLine.style.display = "none";
    document.querySelectorAll(".connector-handle.aim-assist-target").forEach(el => {
      el.classList.remove("aim-assist-target");
    });

    let targetId = null;
    let toPort = "top";

    if (this.aimSnappedPort) {
      // ★ エイムアシストで吸着されたターゲットを最優先で接続
      targetId = this.aimSnappedPort.nodeId;
      toPort = this.aimSnappedPort.port;
    } else if (e && e.target) {
      const handleEl = e.target.closest(".connector-handle");
      const targetEl = e.target.closest(".mind-node");
      if (targetEl) {
        targetId = targetEl.id.replace("dom-", "");
        if (handleEl && handleEl.dataset.port) {
          toPort = handleEl.dataset.port;
        } else {
          const toNode = this.nodes.find(n => n.id === targetId);
          if (toNode) {
            const mouse = this.getCanvasCoords(e);
            const toEl = document.getElementById(`dom-${toNode.id}`);
            const tw = toEl ? toEl.offsetWidth : (toNode.width || 250);
            const th = toEl ? toEl.offsetHeight : (toNode.height || 96);
            const cx = toNode.x + tw / 2;
            const cy = toNode.y + th / 2;
            const dx = mouse.x - cx;
            const dy = mouse.y - cy;
            if (Math.abs(dx) > Math.abs(dy)) {
              toPort = dx < 0 ? "left" : "right";
            } else {
              toPort = dy < 0 ? "top" : "bottom";
            }
          }
        }
      }
    }

    if (targetId && this.connectingSourceId && targetId !== this.connectingSourceId) {
      const exists = this.connections.some(c => 
        (c.from === this.connectingSourceId && c.to === targetId) ||
        (c.from === targetId && c.to === this.connectingSourceId)
      );

      if (!exists) {
        this.pushHistory();
        this.connections.push({
          id: `conn-${Date.now()}`,
          from: this.connectingSourceId,
          to: targetId,
          fromPort: this.connectingSourcePort || "bottom",
          toPort: toPort || "top"
        });
        this.renderConnections();
        this.saveState();
      }
    }

    this.connectingSourceId = null;
    this.connectingSourcePort = null;
    this.aimSnappedPort = null;
  }

  // ==========================================
  // 8. 複数ファイル処理（PDF・テキスト・音声）
  // ==========================================
  async handleMultipleFiles(files) {
    if (!files || files.length === 0) return;

    this.aiStatus.textContent = `${files.length} 件のファイルを順次読み込んでいます...`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|webm|aac)$/i.test(file.name);

        if (isAudio) {
          this.aiStatus.textContent = `音声「${file.name}」を読み込んでいます...`;
          const base64Data = await this.fileToBase64(file);
          let mime = file.type || "audio/mp3";
          if (file.name.endsWith(".m4a")) mime = "audio/m4a";
          if (file.name.endsWith(".wav")) mime = "audio/wav";
          if (file.name.endsWith(".mp3")) mime = "audio/mp3";

          this.attachedFiles.push({
            name: file.name,
            isAudio: true,
            mimeType: mime,
            base64: base64Data,
            size: file.size
          });
        } else {
          const text = await this.extractFileText(file);
          if (text) {
            this.attachedFiles.push({
              name: file.name,
              isAudio: false,
              size: file.size,
              text: text
            });
          }
        }
      } catch (err) {
        console.error("Error reading file:", file.name, err);
      }
    }

    this.renderAttachedFilesList();
    this.updateCombinedTextForAi();
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // data:audio/mp3;base64,XXXX から純粋なBase64を取り出す
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  extractFileText(file) {
    return new Promise((resolve, reject) => {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        if (typeof pdfjsLib === "undefined") {
          reject(new Error("pdf.js が読み込まれていません"));
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        file.arrayBuffer().then(async (arrayBuffer) => {
          try {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const maxPages = Math.min(pdf.numPages, 15);
            let extracted = "";
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              extracted += content.items.map(it => it.str).join(" ") + "\n";
            }
            resolve(extracted.trim());
          } catch (e) {
            reject(e);
          }
        }).catch(reject);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      }
    });
  }

  renderAttachedFilesList() {
    this.attachedFilesList.innerHTML = "";
    this.attachedCount.textContent = this.attachedFiles.length;

    if (this.attachedFiles.length === 0) {
      this.attachedFilesContainer.style.display = "none";
      return;
    }

    this.attachedFilesContainer.style.display = "block";
    this.attachedFiles.forEach((f, idx) => {
      const li = document.createElement("li");
      li.className = "attached-file-item";
      const icon = f.isAudio ? "🎙️" : "📄";
      li.innerHTML = `
        <span class="attached-file-name" title="${this.escapeHtml(f.name)}">${icon} ${this.escapeHtml(f.name)}</span>
        <button class="attached-file-remove" title="取り消す" data-idx="${idx}">✕</button>
      `;

      li.querySelector(".attached-file-remove").addEventListener("click", () => {
        this.attachedFiles.splice(idx, 1);
        this.renderAttachedFilesList();
        this.updateCombinedTextForAi();
      });

      this.attachedFilesList.appendChild(li);
    });
  }

  clearAllAttachedFiles() {
    this.attachedFiles = [];
    this.renderAttachedFilesList();
    this.updateCombinedTextForAi();
    this.aiStatus.textContent = "添付ファイルをすべてクリアしました。";
  }

  updateCombinedTextForAi() {
    const textFiles = this.attachedFiles.filter(f => !f.isAudio);
    const audioFiles = this.attachedFiles.filter(f => f.isAudio);

    let combined = textFiles.map(f => `【文献/ファイル: ${f.name}】\n${f.text}`).join("\n\n");

    if (audioFiles.length > 0) {
      const audioNames = audioFiles.map(a => a.name).join(", ");
      combined += `\n\n【添付音声メモ】: ${audioNames}（※音声を直接解析して思考パーツを抽出します）`;
    }

    this.aiTextInput.value = combined.slice(0, 30000);
    this.manualSourceText.value = combined.slice(0, 30000);

    const countsDesc = [];
    if (textFiles.length > 0) countsDesc.push(`文書 ${textFiles.length}件`);
    if (audioFiles.length > 0) countsDesc.push(`音声 ${audioFiles.length}件`);
    this.aiStatus.textContent = `${countsDesc.join(", ")} をセットしました。`;
  }

  // ==========================================
  // 9. AI解析 ＆ ★確認モーダル表示
  // ==========================================
  toggleAiSidebar() {
    this.aiSidebar.classList.toggle("open");
  }

  async executeGeminiApi() {
    const apiKey = this.apiKeyInput.value.trim();
    if (!apiKey) {
      alert("Google AI Studioで取得した無料のGemini APIキーを入力してください。");
      return;
    }

    const text = this.aiTextInput.value.trim();
    if (!text) {
      alert("分析させたいテキストや論文メモを入力するか、PDFをドロップしてください。");
      return;
    }

    this.runAiBtn.disabled = true;
    this.runAiBtn.textContent = "Geminiが思考パーツを分解中...";
    this.aiStatus.textContent = "AIに最適なモデルを探してリクエストを送信しています...";

    const customInstruction = this.aiInstructionInput ? this.aiInstructionInput.value.trim() : "";
    const prompt = this.buildAnalysisPrompt(text, customInstruction);

    const candidateModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash",
      "gemini-1.5-pro-latest"
    ];

    let lastError = null;
    let success = false;

    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModels = (listData.models || [])
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
          .map(m => m.name.replace("models/", ""));

        const flashModels = availableModels.filter(m => m.includes("flash"));
        if (flashModels.length > 0) {
          candidateModels.unshift(...flashModels);
        } else if (availableModels.length > 0) {
          candidateModels.unshift(...availableModels);
        }
      }
    } catch (e) {
      console.warn("Could not fetch model list automatically, using candidate list.", e);
    }

    const uniqueModels = [...new Set(candidateModels)];

    // リクエスト用パーツの構築（音声ファイルがある場合はマルチモーダル送信）
    const requestParts = [];
    const audioFiles = this.attachedFiles.filter(f => f.isAudio && f.base64);
    for (const audio of audioFiles) {
      requestParts.push({
        inlineData: {
          mimeType: audio.mimeType,
          data: audio.base64
        }
      });
    }
    requestParts.push({ text: prompt });

    for (const model of uniqueModels) {
      try {
        this.aiStatus.textContent = `モデル「${model}」で解析中...${audioFiles.length > 0 ? "（音声を直接聴取中）" : ""}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: requestParts }],
            generationConfig: {
              temperature: 0.3
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("AIから応答が得られませんでした。");

        let cleanJson = rawText.trim();
        const jsonMatch = rawText.match(/```(?:json)?([\s\S]*?)```/);
        if (jsonMatch) {
          cleanJson = jsonMatch[1].trim();
        }

        const parsedCards = JSON.parse(cleanJson);
        if (!Array.isArray(parsedCards)) {
          throw new Error("カードの配列形式として認識できませんでした。");
        }

        // ★いきなりキャンバスに置かず、確認モーダルを開く！
        this.openPreviewModal(parsedCards);
        this.aiStatus.textContent = `解析完了！確認ポップアップで内容をチェックしてください。`;
        success = true;
        break;
      } catch (err) {
        console.warn(`Model ${model} failed:`, err);
        lastError = err;
      }
    }

    if (!success) {
      console.error(lastError);
      this.aiStatus.innerHTML = `<span style="color:#b91c1c">エラー: ${lastError?.message || "接続に失敗しました"}</span>`;
      alert("AI連携エラー: " + (lastError?.message || "利用可能なモデルが見つかりませんでした。") + "\n※手動コピペタブでもすぐに利用可能です。");
    }

    this.runAiBtn.disabled = false;
    this.runAiBtn.textContent = "思考パーツを解析して確認する";
  }

  copyManualPrompt() {
    const text = this.manualSourceText.value.trim() || "（ここに論文や研究のメモが入ります）";
    const customInstruction = this.manualInstructionInput ? this.manualInstructionInput.value.trim() : "";
    const fullPrompt = `${this.buildAnalysisPrompt(text, customInstruction)}\n\n必ず上記で指定されたJSONフォーマットのみを出力してください。`;

    navigator.clipboard.writeText(fullPrompt).then(() => {
      alert("分析用プロンプトをクリップボードにコピーしました。\nWeb版Geminiに貼り付けて回答を取得してください。");
    }).catch(() => {
      prompt("以下のプロンプトをコピーしてください:", fullPrompt);
    });
  }

  applyManualJson() {
    const raw = this.manualResultJson.value.trim();
    if (!raw) {
      alert("Geminiからの回答テキストを貼り付けてください。");
      return;
    }

    try {
      let cleanJson = raw;
      const match = raw.match(/```(?:json)?([\s\S]*?)```/);
      if (match) {
        cleanJson = match[1].trim();
      }

      const parsedCards = JSON.parse(cleanJson);
      if (!Array.isArray(parsedCards)) {
        throw new Error("JSONがカードの配列形式になっていません。");
      }

      // ★確認モーダルを開く
      this.openPreviewModal(parsedCards);
      this.manualResultJson.value = "";
    } catch (err) {
      alert("JSONの読み込みに失敗しました。\n形式を確認してください: " + err.message);
    }
  }

  buildAnalysisPrompt(sourceContent, customInstruction = "") {
    let instructionSection = "";
    if (customInstruction && customInstruction.trim()) {
      instructionSection = `
【ユーザーからの特別指示・着眼点（最重要要件）】:
${customInstruction.trim()}
※上記の指示・着眼点を最優先して思考パーツの抽出・分類を行ってください。

`;
    }

    return `あなたは研究支援の思考整理AIエキスパートです。
以下の研究内容（論文テキスト、研究メモ、または添付された音声メモの録音内容）を総合的に読み込み・聴取し、
「トップダウン（大きな問い・仮説・リサーチクエスチョン）」と「ボトムアップ（先行研究・実験データ・議論で出た知見・気付き）」に分解して、
それぞれの思考パーツをJSON配列として出力してください。
${instructionSection}
【出力JSONフォーマット】:
[
  {
    "type": "topdown", // "topdown" または "bottomup" または "synthesis"
    "title": "簡潔なタイトル（30文字以内）",
    "body": "詳細な要約・考察・メモ",
    "status": "idea" // "idea", "in_progress", "verified", "rejected" のいずれか
  }
]

【分析対象テキスト・メモ情報】:
${sourceContent}
`;
  }

  // ==========================================
  // 10. ★確認・選別モーダルポップアップのロジック
  // ==========================================
  openPreviewModal(cards) {
    this.pendingCards = cards.map((c, i) => ({
      tempId: `pending-${i}-${Date.now()}`,
      type: c.type || "bottomup",
      title: c.title || "無題のカード",
      body: c.body || "",
      status: c.status || "idea"
    }));

    this.renderPreviewCards();
    this.previewModal.style.display = "flex";
  }

  closePreviewModal() {
    this.previewModal.style.display = "none";
    this.pendingCards = [];
  }

  renderPreviewCards() {
    this.previewCardsList.innerHTML = "";
    this.confirmBtnCount.textContent = this.pendingCards.length;

    this.pendingCards.forEach((card, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "preview-card-item";

      itemEl.innerHTML = `
        <div class="preview-card-header">
          <select class="preview-type-select type-${card.type}" data-idx="${index}">
            <option value="topdown" ${card.type === "topdown" ? "selected" : ""}>問い・仮説 (Top-down)</option>
            <option value="bottomup" ${card.type === "bottomup" ? "selected" : ""}>知見・データ (Bottom-up)</option>
            <option value="synthesis" ${card.type === "synthesis" ? "selected" : ""}>検証・合流 (Synthesis)</option>
          </select>
          <button class="preview-delete-btn" title="このカードを除外する" data-idx="${index}">✕ 削除</button>
        </div>
        <input type="text" class="preview-card-title-input" value="${this.escapeHtml(card.title)}" placeholder="タイトル..." data-idx="${index}">
        <textarea class="preview-card-body-input" rows="2" placeholder="詳細メモ..." data-idx="${index}">${this.escapeHtml(card.body)}</textarea>
      `;

      // 属性セレクト変更
      const select = itemEl.querySelector(".preview-type-select");
      select.addEventListener("change", (e) => {
        card.type = e.target.value;
        select.className = `preview-type-select type-${card.type}`;
      });

      // タイトル入力変更
      const titleInput = itemEl.querySelector(".preview-card-title-input");
      titleInput.addEventListener("input", (e) => {
        card.title = e.target.value;
      });

      // 本文変更
      const bodyInput = itemEl.querySelector(".preview-card-body-input");
      bodyInput.addEventListener("input", (e) => {
        card.body = e.target.value;
      });

      // 除外削除ボタン
      const deleteBtn = itemEl.querySelector(".preview-delete-btn");
      deleteBtn.addEventListener("click", () => {
        this.pendingCards.splice(index, 1);
        this.renderPreviewCards();
      });

      this.previewCardsList.appendChild(itemEl);
    });
  }

  addCardToPreview() {
    this.pendingCards.push({
      tempId: `pending-${Date.now()}`,
      type: "bottomup",
      title: "新規カード",
      body: "",
      status: "idea"
    });
    this.renderPreviewCards();
  }

  // 確定してキャンバスに美しく展開
  confirmAndDeployCards() {
    if (this.pendingCards.length === 0) {
      alert("配置するカードがありません。");
      return;
    }

    this.pushHistory(); // Undo用スナップショット

    const startX = (-this.pan.x + this.container.clientWidth / 2) / this.zoom;
    let tdOffset = 0;
    let buOffset = 0;
    let synOffset = 0;

    this.pendingCards.forEach((item, index) => {
      const type = item.type;
      let posX = startX + ((index % 3) - 1) * 270;
      let posY = 200;

      if (type === "topdown") {
        posY = 130 + tdOffset * 115;
        tdOffset++;
      } else if (type === "synthesis") {
        posY = 350 + synOffset * 115;
        synOffset++;
      } else {
        posY = 550 + buOffset * 115;
        buOffset++;
      }

      this.nodes.push({
        id: `node-ai-${Date.now()}-${index}`,
        type,
        title: item.title || "無題のカード",
        body: item.body || "",
        status: item.status || "idea",
        tags: "AI抽出",
        x: Math.round(posX),
        y: Math.round(posY)
      });
    });

    this.render();
    this.saveState();
    this.closePreviewModal();
    this.aiSidebar.classList.remove("open");
  }

  // ==========================================
  // 11. エクスポート・インポート・更地リセット
  // ==========================================
  exportToJsonFile() {
    const data = {
      app: "Synapse Research Notebook",
      version: "2.0",
      exportedAt: new Date().toISOString(),
      nodes: this.nodes,
      connections: this.connections
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `synapse-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.nodes) && Array.isArray(data.connections)) {
          this.pushHistory();
          this.nodes = data.nodes;
          this.connections = data.connections;
          this.render();
          this.saveState();
          alert("研究ノートのデータを読み込みました。");
        } else {
          alert("ファイル形式が正しくありません。");
        }
      } catch (err) {
        alert("読み込みエラー: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  handleResetClick() {
    const label = this.resetCanvasBtn.querySelector(".btn-label");

    if (this.resetCanvasBtn.classList.contains("confirming")) {
      // 2回目のクリック：即座に更地化を実行
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetCanvasBtn.classList.remove("confirming");
      if (label) label.textContent = "更地にする";
      this.executeResetCanvas();
    } else {
      // 1回目のクリック：赤色に点灯して確認モードへ
      this.resetCanvasBtn.classList.add("confirming");
      if (label) label.textContent = "本当に更地に？(クリック)";

      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => {
        this.resetCanvasBtn.classList.remove("confirming");
        if (label) label.textContent = "更地にする";
      }, 4000);
    }
  }

  executeResetCanvas() {
    this.pushHistory(); // 誤操作でも巻き戻せるように履歴保存
    this.nodes = [];
    this.connections = [];
    this.zoom = 1.0;
    this.pan = { x: 70, y: 30 };
    this.zoomLevelText.textContent = "100%";
    this.deselectAll();
    this.render();
    this.updateCanvasTransform();
    this.saveState();
  }

  // ==========================================
  // 12. プロジェクト別セーブ・ロード管理
  // ==========================================
  getProjectsList() {
    try {
      const raw = localStorage.getItem("synapse_projects_index");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return list;
      }
    } catch (e) {}
    return [];
  }

  saveProjectsList(list) {
    try {
      localStorage.setItem("synapse_projects_index", JSON.stringify(list));
    } catch (e) {}
  }

  openProjectsModal() {
    if (!this.projectsModal) return;
    this.projectsModal.style.display = "flex";
    if (this.newProjectNameInput) {
      this.newProjectNameInput.value = this.currentProjectId ? this.currentProjectName : "";
      this.newProjectNameInput.focus();
    }
    this.renderProjectsList();
  }

  closeProjectsModal() {
    if (!this.projectsModal) return;
    this.projectsModal.style.display = "none";
  }

  handleSaveNewProject() {
    const rawName = this.newProjectNameInput ? this.newProjectNameInput.value.trim() : "";
    const name = rawName || `プロジェクト_${new Date().toLocaleDateString("ja-JP").replace(/\//g, "-")}`;
    const id = `proj_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const data = {
      id: id,
      name: name,
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      connections: JSON.parse(JSON.stringify(this.connections)),
      pan: { ...this.pan },
      zoom: this.zoom,
      updatedAt: nowIso
    };

    try {
      localStorage.setItem(`synapse_proj_data_${id}`, JSON.stringify(data));
      const list = this.getProjectsList();
      list.unshift({
        id: id,
        name: name,
        createdAt: nowIso,
        updatedAt: nowIso,
        nodesCount: this.nodes.length,
        connectionsCount: this.connections.length
      });
      this.saveProjectsList(list);

      this.currentProjectId = id;
      this.currentProjectName = name;
      localStorage.setItem("synapse_active_project_id", id);
      localStorage.setItem("synapse_active_project_name", name);

      this.saveState();
      this.renderProjectsList();
      alert(`💾 プロジェクト「${name}」を新しく保存しました！`);
    } catch (e) {
      alert("保存中にエラーが発生しました: " + e.message);
    }
  }

  overwriteProject(projectId) {
    const list = this.getProjectsList();
    const proj = list.find(p => p.id === projectId);
    if (!proj) return;

    if (!confirm(`「${proj.name}」を現在のキャンバス内容で上書き保存しますか？`)) {
      return;
    }

    const nowIso = new Date().toISOString();
    const data = {
      id: projectId,
      name: proj.name,
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      connections: JSON.parse(JSON.stringify(this.connections)),
      pan: { ...this.pan },
      zoom: this.zoom,
      updatedAt: nowIso
    };

    try {
      localStorage.setItem(`synapse_proj_data_${projectId}`, JSON.stringify(data));
      proj.updatedAt = nowIso;
      proj.nodesCount = this.nodes.length;
      proj.connectionsCount = this.connections.length;
      this.saveProjectsList(list);

      this.currentProjectId = projectId;
      this.currentProjectName = proj.name;
      localStorage.setItem("synapse_active_project_id", projectId);
      localStorage.setItem("synapse_active_project_name", proj.name);

      this.renderProjectsList();
      alert(`💾「${proj.name}」を上書き保存しました！`);
    } catch (e) {
      alert("上書き保存エラー: " + e.message);
    }
  }

  loadProject(projectId) {
    const list = this.getProjectsList();
    const proj = list.find(p => p.id === projectId);
    const projName = proj ? proj.name : "プロジェクト";

    let raw = localStorage.getItem(`synapse_proj_data_${projectId}`);

    // ★ 自動救済フォールバック:
    // 個別プロジェクトキーが端末内に欠落していても、メイン保管庫から自動救済・復元する
    if (!raw) {
      const mainSaved = localStorage.getItem("synapse_notebook_data_v2") || localStorage.getItem("synapse_notebook_data");
      if (mainSaved) {
        try {
          const parsedMain = JSON.parse(mainSaved);
          if (Array.isArray(parsedMain.nodes) && parsedMain.nodes.length > 0) {
            raw = mainSaved;
            // 欠損していたプロジェクトキーを自動再生成して安全に保存
            const recoveredData = {
              id: projectId,
              name: projName,
              nodes: parsedMain.nodes,
              connections: parsedMain.connections || [],
              groups: parsedMain.groups || [],
              pan: parsedMain.pan || { x: 70, y: 30 },
              zoom: parsedMain.zoom || 1.0,
              updatedAt: parsedMain.updatedAt || new Date().toISOString()
            };
            localStorage.setItem(`synapse_proj_data_${projectId}`, JSON.stringify(recoveredData));
            console.log(`プロジェクト「${projName}」のデータをメイン保管庫から自動救済しました。`);
          }
        } catch (e) {}
      }
    }

    if (!raw) {
      alert(`プロジェクト「${projName}」のデータがこの端末で見つかりませんでした。

【解決方法】
PCで「書き出し」したファイルをスマホの「読み込み」で開くか、クラウド同期をお試しください。`);
      return;
    }

    try {
      const data = JSON.parse(raw);
      this.pushHistory(); // 読み込み前の状態をUndoできるように退避

      this.nodes = Array.isArray(data.nodes) ? data.nodes : [];
      this.connections = Array.isArray(data.connections) ? data.connections : [];
      this.groups = Array.isArray(data.groups) ? data.groups : [];
      if (data.pan) this.pan = data.pan;
      if (data.zoom) this.zoom = data.zoom;

      this.currentProjectId = projectId;
      this.currentProjectName = projName;
      localStorage.setItem("synapse_active_project_id", projectId);
      localStorage.setItem("synapse_active_project_name", projName);

      this.deselectAll();
      this.render();
      this.updateCanvasTransform();
      this.saveState();
      this.closeProjectsModal();
      alert(`📂 プロジェクト「${projName}」を読み込みました！`);
    } catch (e) {
      alert("読み込みエラー: " + e.message);
    }
  }

  deleteProject(projectId, skipConfirm = false) {
    const list = this.getProjectsList();
    const proj = list.find(p => p.id === projectId);
    const projName = proj ? proj.name : "プロジェクト";

    if (!skipConfirm) {
      if (!confirm(`プロジェクト「${projName}」を完全に削除してもよろしいですか？\n※現在のキャンバスの内容はそのまま残ります。`)) {
        return;
      }
    }

    try {
      localStorage.removeItem(`synapse_proj_data_${projectId}`);
      const updatedList = list.filter(p => p.id !== projectId);
      this.saveProjectsList(updatedList);

      if (this.currentProjectId === projectId) {
        this.currentProjectId = null;
        this.currentProjectName = "未保存のプロジェクト";
        localStorage.removeItem("synapse_active_project_id");
        localStorage.removeItem("synapse_active_project_name");
      }

      // ★ クラウド（Firebase）にも削除を即時同期して復活を完全防止！
      if (this.currentUser && this.firestore) {
        this.syncToCloud(true);
      }

      this.renderProjectsList();
      alert(`🗑️ プロジェクト「${projName}」を完全に削除しました。`);
    } catch (e) {
      alert("削除エラー: " + e.message);
    }
  }

  renderProjectsList() {
    if (!this.projectsListContainer) return;
    const list = this.getProjectsList();

    if (this.savedProjectCount) {
      this.savedProjectCount.textContent = `${list.length} 件`;
    }

    if (this.currentProjectStatus) {
      if (this.currentProjectId) {
        this.currentProjectStatus.innerHTML = `
          <span>現在の作業中プロジェクト:</span>
          <span class="current-badge">${this.escapeHtml(this.currentProjectName)}</span>
        `;
      } else {
        this.currentProjectStatus.innerHTML = `
          <span>現在の作業中: <span style="color:var(--text-dim);">（名前付き未保存）</span></span>
        `;
      }
    }

    if (list.length === 0) {
      this.projectsListContainer.innerHTML = `
        <div class="project-empty-text">
          まだ保存されたプロジェクトがありません。<br>
          上の入力欄に名前を入れて「保存する」を押してください。
        </div>
      `;
      return;
    }

    this.projectsListContainer.innerHTML = "";
    list.forEach(p => {
      const isActive = this.currentProjectId === p.id;
      const card = document.createElement("div");
      card.className = `project-item-card ${isActive ? "is-active" : ""}`;

      const dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleString("ja-JP") : "日時不明";

      card.innerHTML = `
        <div class="project-item-info">
          <div class="project-item-title-row">
            <span class="project-item-title">${this.escapeHtml(p.name)}</span>
            ${isActive ? '<span class="project-active-tag">作業中</span>' : ''}
          </div>
          <div class="project-item-meta">
            <span>📅 更新: ${dateStr}</span>
            <span>📝 カード: ${p.nodesCount || 0}枚 / 線: ${p.connectionsCount || 0}本</span>
          </div>
        </div>
        <div class="project-item-actions">
          <button type="button" class="btn btn-secondary btn-xs btn-load-proj" title="このプロジェクトを開く">
            開く
          </button>
          <button type="button" class="btn btn-secondary btn-xs btn-overwrite-proj" title="現在のキャンバスで上書き">
            上書き
          </button>
          <button type="button" class="btn btn-subtle-danger btn-xs btn-delete-proj" title="プロジェクトを削除">
            削除
          </button>
        </div>
      `;

      const loadBtn = card.querySelector(".btn-load-proj");
      const overwriteBtn = card.querySelector(".btn-overwrite-proj");
      const deleteBtn = card.querySelector(".btn-delete-proj");

      if (loadBtn) {
        loadBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.loadProject(p.id);
        });
      }
      if (overwriteBtn) {
        overwriteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.overwriteProject(p.id);
        });
      }
      if (deleteBtn) {
        let confirmArmed = false;
        let timer = null;

        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();

          if (!confirmArmed) {
            confirmArmed = true;
            deleteBtn.textContent = "本当に削除？";
            deleteBtn.style.backgroundColor = "#ef4444";
            deleteBtn.style.color = "#ffffff";
            deleteBtn.style.borderColor = "#dc2626";

            timer = setTimeout(() => {
              confirmArmed = false;
              deleteBtn.textContent = "削除";
              deleteBtn.style.backgroundColor = "";
              deleteBtn.style.color = "";
              deleteBtn.style.borderColor = "";
            }, 4000);
          } else {
            clearTimeout(timer);
            confirmArmed = false;
            this.deleteProject(p.id, true);
          }
        });
      }

      this.projectsListContainer.appendChild(card);
    });
  }

  // ==========================================
  // 13. Firebase クラウド認証 ＆ クラウド同期
  // ==========================================
  initFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyAp7FGJR9LU6t0dry3UHG11x9aUgqx3hc8",
      authDomain: "research-mindmap.firebaseapp.com",
      projectId: "research-mindmap",
      storageBucket: "research-mindmap.firebasestorage.app",
      messagingSenderId: "192686554582",
      appId: "1:192686554582:web:9aca885f87edb2c6003877",
      measurementId: "G-36BLWQHHK2"
    };

    if (typeof firebase !== "undefined") {
      try {
        if (!firebase.apps || !firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.firebaseAuth = firebase.auth();
        this.firestore = firebase.firestore();

        // App Checkの防御準備（キー登録時に自動保護）
        try {
          if (firebase.appCheck && window.FIREBASE_APPCHECK_KEY) {
            firebase.appCheck().activate(window.FIREBASE_APPCHECK_KEY, true);
          }
        } catch (acErr) {
          console.log("App Check status:", acErr);
        }

        this.firebaseAuth.onAuthStateChanged((user) => {
          this.handleAuthStateChanged(user);
        });
      } catch (e) {
        console.warn("Firebase初期化通知:", e);
      }
    }
  }

  handleAuthStateChanged(user) {
    this.currentUser = user;
    if (user) {
      // ログイン中
      const displayName = user.email ? user.email.split("@")[0] : "ユーザー";
      if (this.authBtnLabel) this.authBtnLabel.textContent = `👤 ${displayName}`;
      if (this.syncStatusIndicator) {
        this.syncStatusIndicator.className = "sync-dot sync-dot-online";
        this.syncStatusIndicator.title = `クラウド同期中: ${user.email}`;
      }
      if (this.authUserEmail) this.authUserEmail.textContent = user.email;

      // メール確認状況のバッジ反映
      if (this.authEmailVerifiedBadge) {
        if (user.emailVerified) {
          this.authEmailVerifiedBadge.textContent = "メール認証済 🟢";
          this.authEmailVerifiedBadge.className = "auth-verify-badge verified";
          if (this.authVerifyWarning) this.authVerifyWarning.style.display = "none";
        } else {
          this.authEmailVerifiedBadge.textContent = "メール未確認 ⚠️";
          this.authEmailVerifiedBadge.className = "auth-verify-badge unverified";
          if (this.authVerifyWarning) this.authVerifyWarning.style.display = "block";
        }
      }

      // クラウドから最新データを取得
      this.pullFromCloud(false);
    } else {
      // 未ログイン（ログアウト）
      if (this.authBtnLabel) this.authBtnLabel.textContent = "ログイン / 登録";
      if (this.syncStatusIndicator) {
        this.syncStatusIndicator.className = "sync-dot sync-dot-offline";
        this.syncStatusIndicator.title = "未ログイン（ローカル保存）";
      }
    }
  }

  openAuthModal() {
    if (!this.authModal) return;
    this.clearAuthError();
    if (this.currentUser) {
      if (this.authLoggedInView) this.authLoggedInView.style.display = "block";
      if (this.authFormsView) this.authFormsView.style.display = "none";

      // モーダルを開いた時に最新の認証ステータスをリロード
      this.currentUser.reload().then(() => {
        if (this.authEmailVerifiedBadge) {
          if (this.currentUser.emailVerified) {
            this.authEmailVerifiedBadge.textContent = "メール認証済 🟢";
            this.authEmailVerifiedBadge.className = "auth-verify-badge verified";
            if (this.authVerifyWarning) this.authVerifyWarning.style.display = "none";
          } else {
            this.authEmailVerifiedBadge.textContent = "メール未確認 ⚠️";
            this.authEmailVerifiedBadge.className = "auth-verify-badge unverified";
            if (this.authVerifyWarning) this.authVerifyWarning.style.display = "block";
          }
        }
      }).catch(() => {});
    } else {
      if (this.authLoggedInView) this.authLoggedInView.style.display = "none";
      if (this.authFormsView) this.authFormsView.style.display = "block";
      this.switchAuthTab("login");
    }
    this.authModal.style.display = "flex";
  }

  closeAuthModal() {
    if (!this.authModal) return;
    this.authModal.style.display = "none";
    this.clearAuthError();
  }

  switchAuthTab(mode) {
    this.authMode = mode;
    this.clearAuthError();
    if (mode === "login") {
      this.authTabLogin?.classList.add("active");
      this.authTabRegister?.classList.remove("active");
      if (this.authTosContainer) this.authTosContainer.style.display = "none";
      if (this.authSubmitBtn) this.authSubmitBtn.textContent = "ログインする";
    } else {
      this.authTabRegister?.classList.add("active");
      this.authTabLogin?.classList.remove("active");
      if (this.authTosContainer) this.authTosContainer.style.display = "block";
      if (this.authTosCheckbox) this.authTosCheckbox.checked = false;
      if (this.authSubmitBtn) this.authSubmitBtn.textContent = "アカウントを新規登録";
    }
  }

  showAuthError(msg) {
    if (this.authErrorMsg) {
      this.authErrorMsg.textContent = msg;
      this.authErrorMsg.style.display = "block";
    }
  }

  clearAuthError() {
    if (this.authErrorMsg) {
      this.authErrorMsg.textContent = "";
      this.authErrorMsg.style.display = "none";
    }
  }

  async handleAuthSubmit() {
    const email = this.authEmailInput ? this.authEmailInput.value.trim() : "";
    const password = this.authPasswordInput ? this.authPasswordInput.value : "";

    if (!email || !password) {
      this.showAuthError("メールアドレスとパスワードを入力してください。");
      return;
    }

    if (password.length < 6) {
      this.showAuthError("パスワードは6文字以上で入力してください。");
      return;
    }

    if (this.authMode === "register") {
      if (this.authTosCheckbox && !this.authTosCheckbox.checked) {
        this.showAuthError("登録を完了するには利用規約および免責事項への同意が必要です。");
        return;
      }
    }

    this.clearAuthError();
    if (this.authSubmitBtn) {
      this.authSubmitBtn.disabled = true;
      this.authSubmitBtn.textContent = "処理中...";
    }

    try {
      if (this.authMode === "login") {
        await this.firebaseAuth.signInWithEmailAndPassword(email, password);
        this.closeAuthModal();
        alert(`🎉 ログインしました！（${email}）\nPCとスマホで同じノートが自動同期されます。`);
      } else {
        const userCred = await this.firebaseAuth.createUserWithEmailAndPassword(email, password);
        const newUser = userCred.user;
        if (newUser) {
          try {
            await newUser.sendEmailVerification();
          } catch (e) {
            console.warn("確認メール送信:", e);
          }
        }
        // 新規登録時、現在キャンバスにあるカードがあればクラウドへ初回同期
        await this.syncToCloud(true);
        this.closeAuthModal();
        alert(`🎉 アカウント登録が完了しました！（${email}）\n\n📧 確認メールを送信しました！メール内のリンクを開いて認証を完了してください。\n（※認証前でもすぐにノートをご利用いただけます）`);
      }
    } catch (err) {
      const code = err.code || "";
      let message = "ログイン・登録に失敗しました。";
      if (code === "auth/invalid-email") message = "メールアドレスの形式が正しくありません。";
      else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") message = "メールアドレスまたはパスワードが間違っています。";
      else if (code === "auth/email-already-in-use") message = "このメールアドレスは既に登録されています。「ログイン」タブをお試しください。";
      else if (code === "auth/weak-password") message = "パスワードが安全ではありません（6文字以上必要です）。";
      else message = err.message;
      this.showAuthError(message);
    } finally {
      if (this.authSubmitBtn) {
        this.authSubmitBtn.disabled = false;
        this.authSubmitBtn.textContent = this.authMode === "login" ? "ログインする" : "アカウントを新規登録";
      }
    }
  }

  async handleResendVerificationEmail() {
    if (!this.currentUser) return;
    try {
      await this.currentUser.sendEmailVerification();
      alert(`📧「${this.currentUser.email}」へ確認メールを再送信しました！メールボックスをご確認ください。`);
    } catch (err) {
      alert("確認メールの再送に失敗しました: " + err.message);
    }
  }

  async handleDeleteAccount() {
    if (!this.currentUser || !this.firebaseAuth) return;

    const email = this.currentUser.email;
    const ok1 = confirm(`【⚠️ 警告】\nアカウント（${email}）と、クラウド上のすべてのノートデータを完全に消去しますか？\n\n※この操作は取り消せません。`);
    if (!ok1) return;

    const ok2 = confirm(`【最終確認】\n本当に退会してよろしいですか？\nカードデータがすべて消去されます。`);
    if (!ok2) return;

    try {
      const uid = this.currentUser.uid;
      if (this.firestore) {
        try {
          await this.firestore.collection("users").doc(uid).delete();
        } catch (e) {}
      }
      await this.currentUser.delete();
      this.currentUser = null;
      this.closeAuthModal();
      alert(`アカウント（${email}）およびクラウド上のデータをすべて消去（退会）しました。ご利用ありがとうございました。`);
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("セキュリティのため、直前の再ログインが必要です。一度ログアウトして再度ログインしてから、退会操作をお試しください。");
      } else {
        alert("アカウント削除エラー: " + err.message);
      }
    }
  }

  async handleLogout() {
    if (!this.firebaseAuth) return;
    try {
      await this.firebaseAuth.signOut();
      this.closeAuthModal();
      alert("ログアウトしました。（ローカルモードに戻りました）");
    } catch (e) {
      alert("ログアウトエラー: " + e.message);
    }
  }

  syncToCloud(immediate = false) {
    if (!this.currentUser || !this.firestore) return;

    const doSync = async () => {
      try {
        const payload = {
          nodes: this.nodes,
          connections: this.connections,
          groups: this.groups,
          pan: this.pan,
          zoom: this.zoom,
          projects: this.getProjectsList(),
          activeProjectId: this.currentProjectId,
          activeProjectName: this.currentProjectName,
          updatedAt: new Date().toISOString()
        };
        await this.firestore.collection("users").doc(this.currentUser.uid).set(payload, { merge: true });
        if (this.syncStatusIndicator) {
          this.syncStatusIndicator.className = "sync-dot sync-dot-online";
        }
      } catch (err) {
        console.warn("クラウド同期エラー:", err);
      }
    };

    if (immediate) {
      return doSync();
    }

    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(doSync, 800);
  }

  async pullFromCloud(notify = false) {
    if (!this.currentUser || !this.firestore) return;

    try {
      const docSnap = await this.firestore.collection("users").doc(this.currentUser.uid).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data && Array.isArray(data.nodes)) {
          this.pushHistory();
          this.nodes = data.nodes;
          this.connections = Array.isArray(data.connections) ? data.connections : [];
          if (data.pan) this.pan = data.pan;
          if (data.zoom) this.zoom = data.zoom;
          if (Array.isArray(data.projects)) this.saveProjectsList(data.projects);
          if (Array.isArray(data.groups)) this.groups = data.groups;
          if (data.activeProjectId) {
            this.currentProjectId = data.activeProjectId;
            this.currentProjectName = data.activeProjectName || "プロジェクト";
            localStorage.setItem("synapse_active_project_id", this.currentProjectId);
            localStorage.setItem("synapse_active_project_name", this.currentProjectName);
            // 個別プロジェクトキーも自動生成
            localStorage.setItem(`synapse_proj_data_${this.currentProjectId}`, JSON.stringify({
              id: this.currentProjectId,
              name: this.currentProjectName,
              nodes: this.nodes,
              connections: this.connections,
              groups: this.groups,
              pan: this.pan,
              zoom: this.zoom,
              updatedAt: data.updatedAt || new Date().toISOString()
            }));
          }

          this.deselectAll();
          this.render();
          this.updateCanvasTransform();

          const localPayload = {
            nodes: this.nodes,
            connections: this.connections,
            pan: this.pan,
            zoom: this.zoom,
            projectId: this.currentProjectId,
            projectName: this.currentProjectName,
            updatedAt: data.updatedAt || new Date().toISOString()
          };
          localStorage.setItem("synapse_notebook_data_v2", JSON.stringify(localPayload));

          if (notify) {
            alert(`☁️ クラウドから最新データ（カード${this.nodes.length}枚）を取得して反映しました！`);
          }
        }
      } else {
        if (this.nodes.length > 0) {
          await this.syncToCloud(true);
        }
      }
    } catch (err) {
      console.warn("クラウドデータ取得エラー:", err);
      if (notify) alert("クラウドデータの取得に失敗しました: " + err.message);
    }
  }

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.app = new SynapseApp();
});

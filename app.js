/**
 * Synapse Research - Core Application Logic
 * トップダウンとボトムアップを統合する温かみのある思考整理ノート
 */

class SynapseApp {
  constructor() {
    this.nodes = [];
    this.connections = [];
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

    // DOM要素の取得
    this.cacheDom();

    // データの読み込み
    this.loadState();

    // イベントリスナーの登録
    this.bindEvents();

    // 初期描画
    this.render();
    this.updateCanvasTransform();
  }

  cacheDom() {
    this.container = document.getElementById("canvas-container");
    this.board = document.getElementById("canvas");
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
    this.nodeStatusSelect = document.getElementById("node-status-select");
    this.nodeBodyInput = document.getElementById("node-body-input");
    this.nodeTagsInput = document.getElementById("node-tags-input");
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
    this.runAiBtn = document.getElementById("run-ai-generate-btn");
    this.aiStatus = document.getElementById("ai-status");

    // 手動コピペ
    this.manualSourceText = document.getElementById("manual-source-text");
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
          if (data.pan) this.pan = data.pan;
          if (data.zoom) this.zoom = data.zoom;
          loaded = true;
        }
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }

    // ★ 現在のデータが空の場合、過去のすべてのキーから救出可能なデータを探す！
    this.checkForRecoverableData(!loaded);
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
  }

  // ==========================================
  // 3. 巻き戻し（Undo）履歴機能
  // ==========================================
  pushHistory() {
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      connections: JSON.parse(JSON.stringify(this.connections))
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
    this.deselectAll();
    this.render();
    this.saveState();
  }

  // ==========================================
  // 4. イベントリスナー登録
  // ==========================================
  bindEvents() {
    // ツールバー
    this.addTopdownBtn.addEventListener("click", () => this.addNewNode("topdown"));
    this.addBottomupBtn.addEventListener("click", () => this.addNewNode("bottomup"));
    this.addSynthesisBtn.addEventListener("click", () => this.addNewNode("synthesis"));
    this.undoBtn.addEventListener("click", () => this.undo());

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
      if (this.resizingNode) {
        const deltaX = (e.clientX - this.startResize.clientX) / this.zoom;
        const deltaY = (e.clientY - this.startResize.clientY) / this.zoom;
        const newWidth = Math.max(160, Math.round(this.startResize.startWidth + deltaX));
        const newHeight = Math.max(70, Math.round(this.startResize.startHeight + deltaY));
        this.resizingNode.width = newWidth;
        this.resizingNode.height = newHeight;
        const el = document.getElementById(`dom-${this.resizingNode.id}`);
        if (el) {
          el.style.width = `${newWidth}px`;
          el.style.height = `${newHeight}px`;
        }
        this.renderConnections();
      } else if (this.isPanning) {
        this.pan.x = e.clientX - this.startPan.x;
        this.pan.y = e.clientY - this.startPan.y;
        this.updateCanvasTransform();
      } else if (this.draggingNode) {
        this.hasDragged = true;
        const x = (e.clientX - this.dragOffset.x - this.pan.x) / this.zoom;
        const y = (e.clientY - this.dragOffset.y - this.pan.y) / this.zoom;
        this.draggingNode.x = Math.max(20, Math.round(x));
        this.draggingNode.y = Math.max(20, Math.round(y));
        this.updateNodePosition(this.draggingNode);
        this.renderConnections();
      } else if (this.connectingSourceId) {
        this.updateDragLine(e);
      }
    });

    window.addEventListener("mouseup", (e) => {
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
    this.nodeStatusSelect.addEventListener("change", () => this.updateSelectedNode("status", this.nodeStatusSelect.value));
    this.nodeBodyInput.addEventListener("input", () => this.updateSelectedNode("body", this.nodeBodyInput.value));
    this.nodeTagsInput.addEventListener("input", () => this.updateSelectedNode("tags", this.nodeTagsInput.value));

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
    this.renderNodes();
    this.renderConnections();
    this.updateEmptyState();
  }

  updateEmptyState() {
    if (this.emptyState) {
      this.emptyState.style.display = this.nodes.length === 0 ? "block" : "none";
    }
  }

  // ==========================================
  // 6. ノード描画・操作 ＆ クイック削除
  // ==========================================
  renderNodes() {
    this.nodesContainer.innerHTML = "";
    this.nodes.forEach(node => {
      const el = document.createElement("div");
      el.className = `mind-node node-${node.type} ${this.selectedNodeId === node.id ? "selected" : ""}`;
      el.id = `dom-${node.id}`;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      if (node.width) el.style.width = `${node.width}px`;
      if (node.height) el.style.height = `${node.height}px`;

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

      // 上部コネクタ
      const topHandle = document.createElement("div");
      topHandle.className = "connector-handle connector-top";
      topHandle.title = "ドラッグして他のカードと線をつなぐ";
      topHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startConnectionDrag(node.id, e);
      });

      // 下部コネクタ
      const bottomHandle = document.createElement("div");
      bottomHandle.className = "connector-handle connector-bottom";
      bottomHandle.title = "ドラッグして他のカードと線をつなぐ";
      bottomHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.startConnectionDrag(node.id, e);
      });

      const typeLabel = node.type === "topdown" ? "Top-down (問い)" :
                        node.type === "bottomup" ? "Bottom-up (知見)" : "Synthesis (統合)";

      el.innerHTML = `
        <div class="node-header">
          <span class="node-badge">${typeLabel}</span>
          <span class="node-status-dot status-${node.status}"></span>
        </div>
        <div class="node-title">${this.escapeHtml(node.title)}</div>
        <div class="node-snippet">${this.escapeHtml(node.body || "（詳細ノートなし）")}</div>
      `;

      el.appendChild(quickDel);
      el.appendChild(resizeHandle);
      el.appendChild(topHandle);
      el.appendChild(bottomHandle);

      el.addEventListener("mousedown", (e) => {
        if (
          e.target.closest(".connector-handle") ||
          e.target.closest(".node-quick-delete") ||
          e.target.closest(".node-resize-handle")
        ) return;
        e.stopPropagation();
        this.selectNode(node.id);

        this.pushHistory(); // 移動前のスナップショット
        this.draggingNode = node;
        this.hasDragged = false;
        const rect = el.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      });

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

  addNewNode(type) {
    this.pushHistory();

    const centerX = (-this.pan.x + this.container.clientWidth / 2) / this.zoom - 125;
    let targetY = (-this.pan.y + this.container.clientHeight / 2) / this.zoom;

    if (type === "topdown") targetY = Math.max(60, targetY - 140);
    if (type === "bottomup") targetY = targetY + 140;

    const id = `node-${Date.now()}`;
    const defaultTitles = {
      topdown: "新規の問い・仮説",
      bottomup: "新規の知見・メモ",
      synthesis: "新規の検証結果"
    };

    const newNode = {
      id,
      type,
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
    this.nodeStatusSelect.value = node.status;
    this.nodeBodyInput.value = node.body || "";
    this.nodeTagsInput.value = node.tags || "";

    const typeNames = {
      topdown: "問い・仮説 (Top-down)",
      bottomup: "知見・データ (Bottom-up)",
      synthesis: "検証・合流 (Synthesis)"
    };
    this.noteTypeBadge.textContent = typeNames[node.type] || "詳細ノート";
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
        el.className = `mind-node node-${value} selected`;
        const badge = el.querySelector(".node-badge");
        if (badge) {
          badge.textContent = value === "topdown" ? "Top-down (問い)" :
                              value === "bottomup" ? "Bottom-up (知見)" : "Synthesis (統合)";
        }
        this.renderConnections();
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
  renderConnections() {
    // ★ defs内のマーカー部品を保護し、描画された接続線のみをピンポイントで削除
    const paths = this.connectionsSvg.querySelectorAll(".connection-path, .connection-hit-path");
    paths.forEach(p => p.remove());

    this.connections.forEach(conn => {
      const fromNode = this.nodes.find(n => n.id === conn.from);
      const toNode = this.nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return;

      // ノードの実際のサイズを取得（テキスト量による高さの変化に対応）
      const fromEl = document.getElementById(`dom-${fromNode.id}`);
      const toEl = document.getElementById(`dom-${toNode.id}`);
      const fromWidth = fromNode.width || (fromEl ? fromEl.offsetWidth : 250);
      const fromHeight = fromNode.height || (fromEl ? fromEl.offsetHeight : 96);
      const toWidth = toNode.width || (toEl ? toEl.offsetWidth : 250);
      const toHeight = toNode.height || (toEl ? toEl.offsetHeight : 96);

      let startX = fromNode.x + fromWidth / 2;
      let endX = toNode.x + toWidth / 2;
      let startY, endY;

      // 丸ポチの外側に矢印の先端がピタッと接する対称クリアランス（7px）
      const clearance = 7.5;

      if (fromNode.y <= toNode.y) {
        // 上から下へ接続：始点（上側）も終点（下側）も丸ポチから全く同じ距離で対称に接する
        startY = fromNode.y + fromHeight + clearance;
        endY = toNode.y - clearance;
      } else {
        // 下から上へ接続
        startY = fromNode.y - clearance;
        endY = toNode.y + toHeight + clearance;
      }

      const deltaY = Math.abs(endY - startY) * 0.5;
      const c1Y = startY < endY ? startY + deltaY : startY - deltaY;
      const c2Y = startY < endY ? endY - deltaY : endY + deltaY;

      const pathData = `M ${startX} ${startY} C ${startX} ${c1Y}, ${endX} ${c2Y}, ${endX} ${endY}`;

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

    this.dragLine.style.display = "block";
    const startX = fromNode.x + 125;
    const startY = fromNode.y + 48;

    this.dragLine.setAttribute("x1", startX);
    this.dragLine.setAttribute("y1", startY);
    this.dragLine.setAttribute("x2", startX);
    this.dragLine.setAttribute("y2", startY);
  }

  updateDragLine(e) {
    const mouseX = (e.clientX - this.pan.x) / this.zoom;
    const mouseY = (e.clientY - this.pan.y) / this.zoom;
    this.dragLine.setAttribute("x2", mouseX);
    this.dragLine.setAttribute("y2", mouseY);
  }

  finishConnectionDrag(e) {
    this.dragLine.style.display = "none";
    const targetEl = e.target.closest(".mind-node");

    if (targetEl && this.connectingSourceId) {
      const targetId = targetEl.id.replace("dom-", "");
      if (targetId !== this.connectingSourceId) {
        const exists = this.connections.some(c => 
          (c.from === this.connectingSourceId && c.to === targetId) ||
          (c.from === targetId && c.to === this.connectingSourceId)
        );

        if (!exists) {
          this.pushHistory();
          this.connections.push({
            id: `conn-${Date.now()}`,
            from: this.connectingSourceId,
            to: targetId
          });
          this.renderConnections();
          this.saveState();
        }
      }
    }

    this.connectingSourceId = null;
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

    const prompt = this.buildAnalysisPrompt(text);

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
    const fullPrompt = `${this.buildAnalysisPrompt(text)}\n\n必ず上記で指定されたJSONフォーマットのみを出力してください。`;

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

  buildAnalysisPrompt(sourceContent) {
    return `あなたは研究支援の思考整理AIエキスパートです。
以下の研究内容（論文テキスト、研究メモ、または添付された音声メモの録音内容）を総合的に読み込み・聴取し、
「トップダウン（大きな問い・仮説・リサーチクエスチョン）」と「ボトムアップ（先行研究・実験データ・議論で出た知見・気付き）」に分解して、
それぞれの思考パーツをJSON配列として出力してください。

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
    if (!proj) return;

    const raw = localStorage.getItem(`synapse_proj_data_${projectId}`);
    if (!raw) {
      alert("プロジェクトデータが見つかりませんでした。");
      return;
    }

    try {
      const data = JSON.parse(raw);
      this.pushHistory(); // 読み込み前の状態をUndoできるように退避

      this.nodes = Array.isArray(data.nodes) ? data.nodes : [];
      this.connections = Array.isArray(data.connections) ? data.connections : [];
      if (data.pan) this.pan = data.pan;
      if (data.zoom) this.zoom = data.zoom;

      this.currentProjectId = projectId;
      this.currentProjectName = proj.name;
      localStorage.setItem("synapse_active_project_id", projectId);
      localStorage.setItem("synapse_active_project_name", proj.name);

      this.deselectAll();
      this.render();
      this.updateCanvasTransform();
      this.saveState();
      this.closeProjectsModal();
      alert(`📂 プロジェクト「${proj.name}」を読み込みました！`);
    } catch (e) {
      alert("読み込みエラー: " + e.message);
    }
  }

  deleteProject(projectId) {
    const list = this.getProjectsList();
    const proj = list.find(p => p.id === projectId);
    if (!proj) return;

    if (!confirm(`プロジェクト「${proj.name}」を削除してもよろしいですか？\n※現在のキャンバスの内容はそのまま残ります。`)) {
      return;
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

      this.renderProjectsList();
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
          <button class="btn btn-secondary btn-xs btn-load-proj" title="このプロジェクトを開く">
            開く
          </button>
          <button class="btn btn-secondary btn-xs btn-overwrite-proj" title="現在のキャンバスで上書き">
            上書き
          </button>
          <button class="btn btn-subtle-danger btn-xs btn-delete-proj" title="プロジェクトを削除">
            削除
          </button>
        </div>
      `;

      card.querySelector(".btn-load-proj").addEventListener("click", () => this.loadProject(p.id));
      card.querySelector(".btn-overwrite-proj").addEventListener("click", () => this.overwriteProject(p.id));
      card.querySelector(".btn-delete-proj").addEventListener("click", () => this.deleteProject(p.id));

      this.projectsListContainer.appendChild(card);
    });
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

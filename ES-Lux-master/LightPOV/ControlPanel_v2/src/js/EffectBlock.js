class EffectBlock {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        
        // 時間資料
        this.startTime = 0;
        this.duration = 1;

        // Fabric 物件參考
        this.fabricGroup = null;
    }
    // 讀取 block.params 時，自動去全域資料庫，用 ID 找出對應的參數
    get params() {
        return globalEffectData[this.id] || {};
    }

    // 寫入 block.params 時，自動更新全域資料庫
    set params(newParams) {
        window.globalEffectData[this.id] = {
            ...newParams,
            id: this.id,       
            name: this.name,    
            startTime: this.startTime,
            duration: this.duration
        };
    }
    /**
     * 在畫布上渲染方塊
     * @param {fabric.Canvas} canvas - 目標畫布
     * @param {number} x - 放置的 X 座標
     * @param {number} y - 放置的 Y 座標
     */
    render(canvas, x, y) {
        // 建立背景方塊
        const boxWidth = 100;
        const boxHeight = 80;
        const bgRect = new fabric.Rect({
            width: boxWidth, height: boxHeight,
            fill: '#333333', stroke: '#ffffff', strokeWidth: 1,
            rx: 5, ry: 5,
            originX: 'center', originY: 'center', strokeUniform: true
        });

        // 建立文字
        const textObj = new fabric.Text(`${this.name}`, {
            fontSize: 16, fill: '#ffffff',
            originX: 'center', originY: 'center'
        });

        // 建立群組
        this.fabricGroup = new fabric.Group([bgRect, textObj], {
            left: x, top: y, // 使用傳入的 y
            originX: 'left', originY: 'center',
            selectable: true,
            lockMovementY: true, lockScalingY: true, lockRotation: true,
            hasBorders: false, cornerColor: 'white', cornerSize: 10,
            transparentCorners: false, objectCaching: false
        });

        // 關鍵：將 Class 實例綁定到 Fabric 物件上
        this.fabricGroup.logicBlock = this; 

        // 設定控制點
        this.fabricGroup.setControlsVisibility({
            mt: false, mb: false, ml: true, mr: true,
            bl: false, br: false, tl: false, tr: false, mtr: false
        });

        // 初始化時間與大小
        // 注意：這裡假設 secondsPerPixel 與 timelineOffset 是全域變數
        this.updateDimensionsFromTime();
        this.startTime = timelineOffset + (x * secondsPerPixel); 

        // 綁定事件
        this._bindEvents(canvas);

        // 加入畫布
        canvas.add(this.fabricGroup);
        return this.fabricGroup;
    }

    // 內部：綁定 Fabric 事件
    _bindEvents(canvas) {
        const group = this.fabricGroup;
        const textObj = group.item(1);
        // 用來控制自動滾動的狀態變數
        let scrollDirection = 0; // 0:停止, 1:往右, -1:往左
        let isScrolling = false; // 防止重複啟動迴圈
        // 定義自動捲動的迴圈函式
        const startAutoScroll = () => {
            if (isScrolling) return; // 如果已經在跑，就不要重複啟動
            isScrolling = true;
            
            const scrollLoop = () => {
                // 如果滑鼠移開或放開，就停止迴圈
                if (scrollDirection === 0) {
                    isScrolling = false;
                    return; 
                }

                // 執行捲動：改變 timelineOffset
                const scrollSpeedPx = 15; 
                
                if (scrollDirection === 1) {
                    timelineOffset += scrollSpeedPx * secondsPerPixel;
                } else if (scrollDirection === -1) {
                    timelineOffset -= scrollSpeedPx * secondsPerPixel;
                    if (timelineOffset < 0) timelineOffset = 0;
                }

               // 畫面更新
                    drawTimeline();
                    updateAssetPositions();                   

                // 更新目前拖曳方塊的 startTime
                this.startTime = timelineOffset + (group.left * secondsPerPixel);

                // 即時寫入全域資料庫
                if (window.globalEffectData[this.id]) {
                    window.globalEffectData[this.id].startTime = this.startTime;
                }

                setTimeout(scrollLoop, 75);
            };
            
            // 啟動迴圈
            scrollLoop();
        };
        // 移動時
        group.on('moving', (e) => {
            // 自動捲動
            const pointer = canvas.getPointer(e.e); // 取得滑鼠在畫布上的座標
            const w = canvas.getWidth();
            const threshold = 50; // 距離邊緣多少像素開始捲動

            // 判斷是否需要捲動
            if (pointer.x > w - threshold) {
                scrollDirection = 1; // 往右
                startAutoScroll();   // 啟動迴圈
            } else if (pointer.x < threshold) {
                scrollDirection = -1; // 往左
                startAutoScroll();
            } else {
                scrollDirection = 0; // 在中間區域，停止捲動
            }

            const bounds = this._getSafeBoundaries(canvas);
            const currentWidth = group.getScaledWidth();

            if (group.left < bounds.minX) group.left = bounds.minX;
            if (group.left + currentWidth > bounds.maxX) group.left = bounds.maxX - currentWidth;

            // 更新內部時間
            this.startTime = timelineOffset + (group.left * secondsPerPixel);

            // 即時寫入資料庫
            if (window.globalEffectData[this.id]) {
                window.globalEffectData[this.id].startTime = this.startTime;
            }
           
        });

        // 縮放時
        group.on('scaling', () => {
            const bounds = this._getSafeBoundaries(canvas);
            const currentWidth = group.getScaledWidth();

            // 抗文字拉伸
            textObj.set({ scaleX: 1 / group.scaleX, scaleY: 1 / group.scaleY });

            // 邊界檢查
            if (group.left  < bounds.minX) {
                group.left = bounds.minX 
            }
            if (group.left + currentWidth > bounds.maxX) {
                // 如果右邊撞牆，限制寬度
                const maxWidth = bounds.maxX - group.left;
                group.scaleX = maxWidth / group.width;
            }

            // 更新 Duration 與 Time
            this.duration = group.getScaledWidth() * secondsPerPixel;
            this.startTime = timelineOffset + (group.left * secondsPerPixel);

            // 即時寫入資料庫
            if (window.globalEffectData[this.id]) {
                window.globalEffectData[this.id].startTime = this.startTime;
                window.globalEffectData[this.id].duration = this.duration;
            }
        });

        // 監聽放開事件
        group.on('mouseup', (e) => {
            scrollDirection = 0;// 停止自動捲動
            // 取得滑鼠在螢幕上的絕對座標
            const clientX = e.e.clientX;
            const clientY = e.e.clientY;

            // 定義所有可能的目標軌道 ID
            const candidateIds = ['assetCanvas1', 'assetCanvas2', 'assetCanvas3', 'assetCanvas4', 'assetCanvas5', 'assetCanvas6'];

            // 檢查滑鼠是否落在其他畫布上
            for (let id of candidateIds) {
                const el = document.getElementById(id);
                if (!el) continue;

                // 取得該畫布在螢幕上的位置與大小
                const rect = el.getBoundingClientRect();

                // 碰撞檢測：滑鼠是否在這個畫布範圍內？
                if (clientX >= rect.left && clientX <= rect.right &&
                    clientY >= rect.top && clientY <= rect.bottom) {
                    
                    // 找到目標畫布實例
                    const targetCanvas = window.getCanvasInstanceById ? window.getCanvasInstanceById(id) : null;

                    // 如果目標存在，且不是原本的畫布，就進行搬移
                    if (targetCanvas && targetCanvas !== canvas) {
                        console.log(`搬移方塊 ${this.name} 到 ${id}`);

                        // 記錄當前的 X 位置 (保持時間點不變)
                        const currentLeft = group.left;

                        // 從舊畫布移除
                        canvas.remove(group);
                        canvas.requestRenderAll();

                        // 在新畫布重新渲染
                        const newCenterY = targetCanvas.getHeight() / 2;
                        this.render(targetCanvas, currentLeft, newCenterY);
                        
                        // 更新新畫布
                        targetCanvas.requestRenderAll();
                        
                        // 完成搬移，跳出迴圈
                        return;
                    }
                }
            }
        });
        
        // 額外保險：如果拖到一半滑鼠移出畫布或取消選取
        group.on('deselected', () => {
            scrollDirection = 0;
        });
    }

    // 內部：取得邊界
    _getSafeBoundaries(canvas) {
        let minX = -timelineOffset / secondsPerPixel;;
        let maxX = Infinity;
        const activeObj = this.fabricGroup;
        
        // 計算目前作用物件的中心點 X
        const activeCenter = activeObj.left + (activeObj.getScaledWidth() / 2);

        canvas.getObjects().forEach(other => {
            if (other === activeObj) return;
            if (!other.logicBlock) return;

            const otherLeft = other.left;
            const otherRight = other.left + other.getScaledWidth();
            const otherCenter = otherLeft + (other.getScaledWidth() / 2);

            
            // 情況 A: 對方在我的左邊 (對方的中心點 < 我的中心點)
            // 我們要找的是「左側鄰居中最右邊的邊緣」 -> 設定 minX
            if (otherCenter < activeCenter) {
                if (otherRight > minX) minX = otherRight;
            }

            // 情況 B: 對方在我的右邊 (對方的中心點 > 我的中心點)
            // 我們要找的是「右側鄰居中最左邊的邊緣」 -> 設定 maxX
            if (otherCenter > activeCenter) {
                if (otherLeft < maxX) maxX = otherLeft;
            }
        });
        return { minX, maxX };
    }

    // 工具：根據目前的 duration 設定 scaleX
    updateDimensionsFromTime() {
        if (!this.fabricGroup) return;
        const targetWidthPx = this.duration / secondsPerPixel;
        this.fabricGroup.scaleX = targetWidthPx / this.fabricGroup.width;
        
        // 修正文字
        const textObj = this.fabricGroup.item(1);
        if(textObj) {
            textObj.set({ scaleX: 1 / this.fabricGroup.scaleX, scaleY: 1 });
        }
    }
}
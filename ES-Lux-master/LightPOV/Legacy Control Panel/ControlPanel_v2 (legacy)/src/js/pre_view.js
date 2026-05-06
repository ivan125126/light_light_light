//------------------------------------------------------------------------------
// Pre_view 是一個HTML元件，可直接在html中使用，用於模擬 LED 圓環燈效的前端預覽
// 直接寫 <pre-view pre-view-data = "data.json" ></pre-view> 這樣就可以用了
// 
//------------------------------------------------------------------------------
//
// HTNL屬性（Attributes）
//
// 屬性名稱	                說明	                           預設值
// width	               畫布寬度（px）	                   500
// height	               畫布高度（px）	                   500
// pre-view-data	       編招JSON 路徑	                   必填
// led-bulb-size	       單顆 LED 顯示大小（px）	            2
// led-bulb-spacing    	   LED 之間的間距（px）	                3
// inner-radius	           圓環內徑半徑（px）               	80
// anime	               是否啟用動畫效果 (true / false)   	false
// speed	               動畫播放速度（數值越大越快）	         60
//
//
//------------------------------------------------------------------------------

class Pre_view extends HTMLElement {

    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });    
    }

    
    
    async connectedCallback() {//當元件被加入到 DOM 時觸發
        this.animationFrameId = null; // 用來記錄動畫 ID 以便隨時取消
        this.currentTimer = 0;        // 記錄目前的播放幀數

    //-----------------------------------------------------------
    //  建立畫布
    //-----------------------------------------------------------
        const width             = Number(this.getAttribute('width'))  || 500;
        const height            = Number(this.getAttribute('height')) || 500;
        const data_path         = this.getAttribute("pre-view-data");
        this.led_bulb_size      = Number(this.getAttribute('led-bulb-size')) || 2;
        this.inner_radius       = Number(this.getAttribute('inner-radius')) || 80;
        this.led_bulb_spacing   = Number(this.getAttribute('led-bulb-spacing')) || 3;
        this.anime              = (this.getAttribute('anime') || "false") == "true";
        this.speed              = Number(this.getAttribute('speed')) || 60;
        this.mode_idx           = Number(this.getAttribute('mode-idx')) || 0;

        // 建立 canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        // 將 canvas 加入 shadow DOM
        this.shadowRoot.appendChild(this.canvas);        
        /*
        //載入 add.js 並使用其中的 add 函式
       async function loadAdd() {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "add.js";  // 相對路徑
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });

            // 等 Module 初始化
            Module.onRuntimeInitialized = () => {
                console.log(Module._add(3, 4));
            };
        }
        loadAdd();
        */

    //-----------------------------------------------------------
    //  繪製背景
    //-----------------------------------------------------------

        this.ctx = this.canvas.getContext('2d', {willReadFrequently: true}); //增加 willReadFrequently 選項以提升讀取效能
        let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        //繪製黑色底色
        for (let i = 0; i < this.canvas.width; i++) {
            for (let j = 0; j < this.canvas.height; j++) {
                const idx = (j * this.canvas.width + i) * 4;
                imageData.data[idx] = 0;
                imageData.data[idx + 1] = 0;
                imageData.data[idx + 2] = 0;
                imageData.data[idx + 3] = 255; 
            }   
        } 

        //繪製灰色網格
        for (let i = 0; i < this.canvas.width; i+=20) {
            for (let j = 0; j < this.canvas.height; j++) {
                const idx = (j * this.canvas.width + i) * 4;
                imageData.data[idx] = 27;
                imageData.data[idx + 1] = 27;
                imageData.data[idx + 2] = 27;
                imageData.data[idx + 3] = 255; 
            }   
        }         
        for (let i = 0; i < this.canvas.width; i++) {
            for (let j = 0; j < this.canvas.height; j+=20) {
                const idx = (j * this.canvas.width + i) * 4;
                imageData.data[idx] = 27;
                imageData.data[idx + 1] = 27;
                imageData.data[idx + 2] = 27;
                imageData.data[idx + 3] = 255; 
            }   
        } 
        //建立二維陣列存放 LED 資料 led_show_arr[60][32][3]
        let led_show_arr = new Array(10000);
        for (let i = 0; i < 10000; i++) {
            led_show_arr[i] = new Array(32);
            for (let j = 0; j < 32; j++) {
                led_show_arr[i][j] = new Array(4).fill(0); 
            }
        }

    //-----------------------------------------------------------
    //  讀取json檔
    //-----------------------------------------------------------

    /*    const mode_json_data = await this.loadJSON(data_path);     



    //-----------------------------------------------------------
    //  計算LED顏色
    //-----------------------------------------------------------
          
        for (let i = 0; i < ((this.anime)?1000:Math.floor(10000/this.speed)); i++) {
                //計算顏色
                this.updateHeading(mode_json_data[this.mode_idx], i, 0, led_show_arr);
                //計算形狀
                this.perform(mode_json_data[this.mode_idx], led_show_arr);
        }
        

        this.ctx.putImageData(imageData, 0, 0);
        this.update(0,led_show_arr);*/
    }

// 接收即時資料並重新計算
updateData(modeData) {
    if (!modeData) return;

    // 停止舊的動畫迴圈
    if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    // 重置時間與陣列
    this.currentTimer = 0;
    let led_show_arr = new Array(10000);
    for (let i = 0; i < 10000; i++) {
        led_show_arr[i] = new Array(32);
        for (let j = 0; j < 32; j++) {
            led_show_arr[i][j] = [0, 0, 0, 255];
        }
    }

    // 預先計算每一幀的顏色與形狀
    const calcFrames = Math.max(10000, modeData.duration || 10000);

    // 效能優化：原本 perform 放在迴圈內會重複執行一千次導致瀏覽器停住。
    // 現在我們「先算顏色」，「再算形狀」，邏輯才正確且流暢。
    for (let i = 0; i < calcFrames; i++) {
        // 第 4 個參數不傳入 timer，避免提早 return 導致沒有顏色
        this.updateHeading(modeData, i, 0, led_show_arr);
    }

    // 一次性套用形狀遮罩 (sickle, fan, boxes 等)
    this.perform(modeData, led_show_arr);

    // 4. 啟動乾淨的獨立動畫迴圈
    this.currentTimer = 0;

    // 將迴圈封裝在內部，絕對不會跟其他人衝突
    const loop = () => {
        // 呼叫原本的底層繪圖函式繪製畫面
        this.drawSomething(this.currentTimer, led_show_arr);

        this.currentTimer++;
        // 設定循環播放的長度 (若覺得動畫太快/太短，可以將 250 調大)
        if (this.currentTimer > 10000) {
            this.currentTimer = 0;
        }

        // 註冊下一幀，並儲存 ID 以便隨時停止
        this.animationFrameId = requestAnimationFrame(loop);
    };

    // 正式啟動
    this.animationFrameId = requestAnimationFrame(loop);
}


    //讀取 json & 繪製，並將長方形內容偏移到圓形上，更新頻率約為60fps(以瀏覽器為準)
    async drawSomething(timer, led_show_arr) {
        const speed = this.speed;

        let show_time = Math.floor(10000/speed);

        timer++;
        if(Math.floor(timer)%60==0) console.log(Math.floor(timer)/60);

    
        //開始渲染啦!!
        
        this.ctx = this.canvas.getContext('2d', {willReadFrequently: true}); //增加 willReadFrequently 選項以提升讀取效能
        let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        


        //將長方形內的內容偏移到圓形上
        for (let i = 0; i < ((this.anime)?timer*speed/20 +30:show_time); i++) {
            for (let j = 0; j < 32; j++) {     
                //顏色
                let r, g, b;
                r = led_show_arr[i][j][0];
                g = led_show_arr[i][j][1];
                b = led_show_arr[i][j][2]; 
                //位置
                const cx = this.canvas.width>>1; // 圓心 X
                const cy = this.canvas.height>>1; // 圓心 Y
                const inner_radius = this.inner_radius;
                const outer_radius = inner_radius + 140;
                //console.log(`${inner_radius}`);
                let col_x = cx + (Math.round( ( (outer_radius-j*this.led_bulb_spacing) ) * Math.sin( ((i*(-1)+show_time/2)/show_time)*2*Math.PI ) ) );
                let col_y = cy + (Math.round( ( (outer_radius-j*this.led_bulb_spacing) ) * Math.cos( ((i*(-1)+show_time/2)/show_time)*2*Math.PI ) ) );
                
                //繪製小方塊
                if(((this.anime)?(i < timer*speed/20-30):(false))){
                    for(let w=0; w<this.led_bulb_size; w++){
                        for(let h=0; h<this.led_bulb_size; h++){
                            const idx = ((col_y+w) * this.canvas.width + col_x+h) * 4;
                            imageData.data[idx] = 0;
                            imageData.data[idx + 1] = 0;
                            imageData.data[idx + 2] = 0;
                            imageData.data[idx + 3] = 256; 
                        }
                    }
                }else{
                    for(let w=0; w<this.led_bulb_size; w++){
                        for(let h=0; h<this.led_bulb_size; h++){
                            const darken = ((this.anime)?((timer*speed/20+15-i)*3):0)
                            const idx = ((col_y+w) * this.canvas.width + col_x+h) * 4;
                            imageData.data[idx] = r-darken;
                            imageData.data[idx + 1] = g-darken;
                            imageData.data[idx + 2] = b-darken;
                            imageData.data[idx + 3] = 256; 
                        }
                    }
                }
            }
        }
 

        this.ctx.putImageData(imageData, 0, 0);
    }
    
    update(timer, led_show_arr) {
        this.drawSomething(timer, led_show_arr); 
        if(timer > 500) timer = 0;
        requestAnimationFrame(() => this.update((timer+1), led_show_arr));
    }

    async loadJSON(data_path) {
        try {
            const response = await fetch(data_path);
            if (!response.ok) throw new Error('讀取錯誤');
            const jsonData = await response.json();

            return jsonData[0];
            
        } catch (err) {
            console.error(err);
        }
    }

    LIMIT_OUTPUT(x) {
        if (x > 0xff) return 0xff; 
        if (x < 0) return 0;
        return x;
    }


    /************************************
     *       Scheduler Functions
     ************************************/
    /* Create ramp-like function 
    *   /     /     upper
    *  /     /
    * +     +       lower
    * |range|
    */ 
    calc_ramp(idx, range, lower, upper, overflow){
        const mod = idx % range;
        const output = lower + (Math.floor(Math.floor(mod))* (upper - lower) / range);
        return (!overflow)?this.LIMIT_OUTPUT(output):output;
    }

        
    /* Create triangular-like function 
    *   / \   /    upper
    *  /   \ /
    * +     +      lower
    * |range|
    */ 
    calc_tri(idx, range, lower, upper, overflow){
        const delta = upper - lower;
        const half = range / 2;
        const mod = idx % range;
        const output = lower + Math.floor(Math.abs(Math.floor(mod) - half) * delta / half);
        return (!overflow)?this.LIMIT_OUTPUT(output):output;
        //return (!overflow && output > 0xff) ? 255 : output;
    }

        
    /* Create pulse-like function 
    *  |\        upper
    *  | \  
    *  |   --    lower
    * @Param:
    *      top: length of peak time
    * # TODO: the `lower` parameter is useless now
    */ 
    calc_pulse(idx, range, lower, top){
        const mod = idx - Math.floor((idx/range) * range);
        if (mod < top) return 0xff;
        const decay = Math.floor((idx - top) * 8 / range);
        return 0xff >> decay;
    }

        
    /* Create step-like function 
    *         -----  lower+step*2
    *        |     |
    *   -----      | lower+step
    *  |           |
    * +     +     +  lower
    * |range|range|
    * num = 2
    */ 
    calc_step(idx, range, lower, step, num, overflow){
        const state = Math.floor((Math.floor(idx) % (range * num)) / range);
        const output = lower + step * state;
        return output;
        //return (!overflow && output > 0xff) ? 255 : output;
    }
/*
    SetXHsvParam(H, S, V){
        XHp = H; XSp = S; XVp = V;
    }

    SetYHsvParam(H, S, V){
        YHp = H; YSp = S; YVp = V;
    }
*/
    /* Return function value according to the parameter
    * See also @SchedulerFunc in core.h             */
    getFuncValue(vp, idx, overflow){
        //console.log(`func: ${vp.p1}`);
        switch (vp.func){
            case 1:
                return vp.p1;
            case 2:
                return this.calc_ramp(idx, vp.range, vp.lower, vp.p1, true);
            case 3:
                return this.calc_tri(idx, vp.range, vp.lower, vp.p1, true);
            case 4:
                return this.calc_pulse(idx, vp.range, vp.lower, vp.p1);
            case 5:
                return this.calc_step(idx, vp.range, vp.lower, vp.p1, vp.p2, true);
            default:
                return 0;
        }
    }

    updateHeading(mode_json_data, idx, restart, led_show_arr, timer){
        if (idx>timer*30) return;
        let delta = 0;
        
        if (restart)    delta = idx - mode_json_data.start_time;
        else            delta = idx - 0;
        
        delta = idx;
       // console.log(`idx: ${mode_json_data.XH.range}`);

        let h, s, v;
        h = this.getFuncValue(mode_json_data.XH, delta) % 256;
        s = this.getFuncValue(mode_json_data.XS, delta) % 256;
        v = this.getFuncValue(mode_json_data.XV, delta) % 256;
        for(let j=0; j<32; j++){    
            let yh, ys, yv;
            yh = (h + this.getFuncValue(mode_json_data.YH, j))%256;
            ys = (s + this.getFuncValue(mode_json_data.YS, j))%256;
            yv = (v + this.getFuncValue(mode_json_data.YV, j))%256;
            let rgb_value = this.hsvToRgb(yh, ys, yv);
           // console.log(`h: ${yh}, s: ${ys}, v: ${yv}, r: ${rgb_value.r}, g:  ${rgb_value.g}, b: ${rgb_value.b}`);
           
            led_show_arr[idx][j][0] = rgb_value.r;
            led_show_arr[idx][j][1] = rgb_value.g;
            led_show_arr[idx][j][2] = rgb_value.b;    
        } 
         
    }

    hsvToRgb(h, s, v) {
        // 將 H, S, V 歸一化到標準範圍：
        // H: 0-360度; S, V: 0-1
        let h_norm = h / 255 * 360; // 將 0-255 轉換為 0-360
        let s_norm = s / 255;       // 將 0-255 轉換為 0-1
        let v_norm = v / 255;       // 將 0-255 轉換為 0-1

        let r, g, b;

        if (s_norm === 0) {
            // 如果飽和度為 0，則顏色為灰色 (R=G=B=V)
            r = g = b = v_norm;
        } else {
            let i = Math.floor(h_norm / 60);
            let f = h_norm / 60 - i;
            
            let p = v_norm * (1 - s_norm);
            let q = v_norm * (1 - f * s_norm);
            let t = v_norm * (1 - (1 - f) * s_norm);

            switch (i % 6) {
                case 0: r = v_norm; g = t; b = p; break; // R -> Y
                case 1: r = q; g = v_norm; b = p; break; // Y -> G
                case 2: r = p; g = v_norm; b = t; break; // G -> C
                case 3: r = p; g = q; b = v_norm; break; // C -> B
                case 4: r = t; g = p; b = v_norm; break; // B -> M
                case 5: r = v_norm; g = p; b = q; break; // M -> R
            }
        }

        // 將 R, G, B 從 0-1 範圍轉換回 0-255 範圍 (並確保為整數)
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /*
    updateHeading(idx, restart, led_show_arr){
        delta=0;
        
        //if (restart)    delta = idx - effect_start_idx;
        //else            delta = idx - 0;
        
        delta = idx;
        headingColor.h = getFuncValue(XHp, delta);
        headingColor.s = getFuncValue(XSp, delta);
        headingColor.v = getFuncValue(XVp, delta);
    }

*/
/*
    CRGB inline ColorScheduler::getPixelColor(uint8_t y){
        return CHSV(headingColor.h + getFuncValue(&YHp, y),
                    headingColor.s + getFuncValue(&YSp, y),
                    headingColor.v + getFuncValue(&YVp, y));
    }
*/


    perform(mode_json_data, led_show_arr){
        /*
    if (force_start == 2){
      effect_id = 0;
      buffer.clean();
    }
    if (buffer.isEmpty()) {
      clear();
      lightOnOneLED(CHSV(130, 200 ,55));
      return;
    }
    Mode m;
    buffer.peek(m);
    if (m.start_time < getMusicTime() || force_start == 1){
        // Load new mode
        buffer.pop(&m);
        Serial.print("Now Performing: ");
        Serial.println(m.mode);*/
        switch(mode_json_data.mode){
            case "MODES_CLEAR":      this.clear          (mode_json_data, led_show_arr);  break;
            case "MODES_PLAIN":      this.plain          (mode_json_data, led_show_arr);  break;
            case "MODES_SQUARE":     this.square         (mode_json_data, led_show_arr);  break;
            case "MODES_SICKLE":     this.sickle         (mode_json_data, led_show_arr);  break;
            case "MODES_FAN":        this.fan            (mode_json_data, led_show_arr);  break;
            case "MODES_BOXES":      this.boxes          (mode_json_data, led_show_arr);  break;
            case "MODES_MAP_ES":     this.bitmapEs       (mode_json_data, led_show_arr);  break;
            case "MODES_MAP_ES_ZH":  this.bitmapEsZh     (mode_json_data, led_show_arr);  break;
            case "MODES_CMAP_DNA":   this.colormapDna    (mode_json_data, led_show_arr);  break;
            case "MODES_CMAP_FIRE":  this.colormapFire   (mode_json_data, led_show_arr);  break;
            case "MODES_CMAP_BENSON":this.colormapBenson (mode_json_data, led_show_arr);  break;
            case "MODES_CMAP_YEN":   this.colormapYen    (mode_json_data, led_show_arr);  break;
            case "MODES_CMAP_LOVE":  this.colormapLove   (mode_json_data, led_show_arr);  break;
            case "MODES_CMAP_GEAR":  this.colormapGear   (mode_json_data, led_show_arr);  break;
            case "MODES_MAP_ESXOPT": this.bitmapESXOPT   (mode_json_data, led_show_arr);  break;
            default: console.log("we don't have this mode."); break;
        }
    /*
    else{
      clear();
      lightOnOneLED(CHSV(130, 200 ,55));
    }
      */
    }
 

    /************************************
     *              Effects
     ************************************/
   
    clear(m, led_show_arr){     
        for (let idx = 0; idx<m.duration; idx++){
            for(let j=0; j<32; j++){
                led_show_arr[idx][j][0] = 0;
                led_show_arr[idx][j][1] = 0;
                led_show_arr[idx][j][2] = 0;
            }
        }
    }
    plain(m, led_show_arr){
        for (let idx = 0; idx<m.duration; idx++){

        }
    }

    square(m, led_show_arr){
        // Serial.println("Square"); 
        // uint8_t boxsize = m->param[2];
        let boxsize = Math.round(Number(m.p3)); 
        if (boxsize <= 1) boxsize = 2; // 防呆機制，避免無窮迴圈

        // while( checkDuration(m) ) 相當於檢查 idx 是否還在 duration 內
        for (let idx = 0; idx < m.duration;) {
            let start_idx = idx; // 記錄這個週期的起點 (對應 setEffectBlockStart)
            
            // for (int b=1; b<boxsize; b++)
            for (let b = 1; b < boxsize && idx < m.duration; b++) {
                
                // uint32_t map = 0;
                let map = 0n; 
                
                // uint32_t unit = ((uint32_t)0x1<<b) - 1;
                if (b < 32) {
                    let unit = (1n << BigInt(b)) - 1n;
                    
                    // for (int k=0; k<boxsize/b; k++) map |= unit << (2*k);
                    let limit = Math.floor(boxsize / b);
                    for (let k = 0; k < limit; k++) {
                        let shiftAmount = 2 * k; 
                        // 保護機制：確保位移不超過 32 bit 導致錯誤
                        if (shiftAmount < 32) {
                            map |= (unit << BigInt(shiftAmount)); 
                        }
                    }
                }
                
                // for (int j=0; j<boxsize/b; j+=2)
                let j_limit = Math.floor(boxsize / b);
                for (let j = 0; j < j_limit && idx < m.duration; j += 2) {
                    
                    // sch.getPixelColor(pixels, map, CHSV(0, 0, 0));
                    // C++ 中這行代表：如果 map 該位元是 0，就塗成黑色 (0,0,0)
                    if (led_show_arr[idx]) {
                        for (let jdx = 0; jdx < 32; jdx++) {
                            let bit = (map >> BigInt(jdx)) & 1n;
                            if (bit === 0n) {
                                led_show_arr[idx][jdx] = [0, 0, 0, 255]; // 黑色
                            }
                        }
                    }
                    
                    // showLED(); 
                    // C++ 的 showLED() 相當於網頁中「把時間 (idx) 往前推進一格」
                    idx++;
                    
                    // map ^= map; 
                    // 自己跟自己 XOR，結果就是 0。這會讓同一圈的下一影格遮罩變成全黑！
                    map = 0n; 
                }
            }

            // 防呆：如果參數過小導致內部 for 迴圈沒跑、時間沒推進，強制推進時間以免當機
            if (idx === start_idx) idx++;
        }
    }

    boxes(m, led_show_arr){
        //Serial.println("Boxes");
        const boxsize = m.p3;
        const space = m.p4;
        //setEffectStart(m);
        for (let idx = 0; idx<m.duration;idx++){
            for (let b=1; b<boxsize; b++){
                let map = 0;

                let unit = ((1<<b) - 1) << ((32 - b)/2);
                for (let j=0; j<boxsize/2; j++,idx++){                    
                    for(let jdx=0,chuse_bit=1; jdx<32; jdx++){
                        if(!(map & chuse_bit)){
                            led_show_arr[idx][jdx][0] = 0;
                            led_show_arr[idx][jdx][1] = 0;
                            led_show_arr[idx][jdx][2] = 0;
                        }
                        chuse_bit <<= 1;
                    }
                }
                for (let j=0; j<space; j++){
                    
                }
            }
        }
        /*while( checkDuration(m) ){
            setEffectBlockStart();
            for (int b=1; b<boxsize; b++){
                uint32_t map = 0;

                uint32_t unit = (((uint32_t)0x1<<b) - 1) << ((NUMPIXELS - b)/2);
                for (int j=0; j<boxsize/2; j++){
                    uint16_t idx = getIdx();
                    sch.updateHeading(idx);
                    sch.getPixelColor(pixels, unit, CHSV(0, 0, 0));
                    showLED();
                }
                for (int j=0; j<space; j++){
                    FastLED.clear();
                    showLED();
                }
            }
        }*/
    }

    sickle(m, led_show_arr){
        // Serial.println("Sickle");
        // uint8_t position_fix = m->param[0]; (雖然硬體有讀取，但迴圈內沒用到)
        // uint8_t width = m->param[2];
        let width = Math.round(Number(m.p3));
        
        // uint8_t space = m->param[3];
        let space = Math.round(Number(m.p4));
        
        // 防呆機制：避免 width 或 space 為 0 時導致瀏覽器當機
        if (width <= 1 && space <= 0) width = 2; 

        // while( checkDuration(m) )
        for(let idx = 0; idx < m.duration;){
            let start_idx = idx; // 記錄週期起點
            
            // FastLED.clear(); 
            // 寫在 b 迴圈外，代表每個週期開始時，準備一條全黑的乾淨燈帶
            let current_strip = Array.from({length: 32}, () => [0, 0, 0, 255]);
            
            // for (int b=1; b<width; b++)
            for (let b = 1; b < width && idx < m.duration; b++){
                
                // 區段計算：等同於 C++ 的 NUMPIXELS_DEFAULT * (b-1) / width
                let startLed = Math.floor(32 * (b - 1) / width);
                let endLed = Math.floor(32 * b / width);
                
                if (led_show_arr[idx]){
                    // 掃描這 32 顆燈
                    for (let l = 0; l < 32; l++){
                        // for (int l=(NUMPIXELS_DEFAULT * (b-1) / width); l < ... ; l++)
                        // 如果 l 落在當前計算的區段內，就從背景陣列中取得最新算好的顏色
                        if(l >= startLed && l < endLed){
                            // pixels[l] = sch.getPixelColor(l);
                            current_strip[l] = [...led_show_arr[idx][l]];
                        }
                        
                        // 把硬體當下的燈帶狀態 (包含之前 b 迴圈留下來的燈)，覆蓋回畫面上
                        led_show_arr[idx][l] = [...current_strip[l]];
                    }
                }
                
                // showLED(); (時間推進一格)
                idx++;
            }
            
            // for (int j=0; j<space; j++)
            for (let j = 0; j < space && idx < m.duration; j++){
                if (led_show_arr[idx]) {
                    for(let l = 0; l < 32; l++){
                        // FastLED.clear();
                        led_show_arr[idx][l] = [0, 0, 0, 255]; // 黑色
                    }
                }
                // showLED(); (時間推進一格)
                idx++;
            }
            
            // 強制推進時間以免參數為 0 時陷入無限迴圈
            if (idx === start_idx) idx++; 
        }
    }

    fan(m, led_show_arr){
        // uint8_t width = m->param[0]; (在您的 JS 參數定義中，p1 對應 param[0])
        let width = Math.round(Number(m.p1));
        // uint8_t density = m->param[2]; (p3 對應 param[2])
        let density = Math.round(Number(m.p3));
        // uint8_t thickness = m->param[3]; (p4 對應 param[3])
        let thickness = Math.round(Number(m.p4));

        // 防呆保護：避免 density 為 0 導致 C++ 裡的 NUMPIXELS_DEFAULT / density 發生除以零崩潰
        if (width <= 0) width = 1;
        if (density <= 0) density = 1;

        // while( checkDuration(m) )
        for(let idx = 0; idx < m.duration;){
            let start_idx = idx; // 記錄這個週期的起點
            
            // for (int w=0; w<width; w++)
            for (let w = 0; w < width && idx < m.duration; w++, idx++){
                
                // FastLED.clear(); 
                // 我們建立一個陣列來記錄哪些燈要亮，預設全暗 (false)
                let lightUp = new Array(32).fill(false);

                // uint8_t led_idx = (NUMPIXELS_DEFAULT * w / width) % density;
                let led_idx = Math.floor(32 * w / width) % density;
                
                // for (int d=0; d<=NUMPIXELS_DEFAULT/density; d++)
                for (let d = 0; d <= Math.floor(32 / density); d++){
                    // for (int t=0; t<thickness; t++)
                    for (let t = 0; t < thickness; t++){
                        // uint16_t lidx = led_idx + d * density + t;
                        let lidx = led_idx + d * density + t;
                        
                        // if (lidx < NUMPIXELS_DEFAULT)
                        if (lidx < 32) lightUp[lidx] = true;
                    }
                }
                
                if (led_show_arr[idx]){
                    // 1:1 模擬 sch.getPixelColor(idx) 的行為
                    // 由於它傳入的是時間(idx)，代表當下所有的扇葉共用同一個「純色」
                    let h = m.XH ? this.getFuncValue(m.XH, idx) : 0;
                    let s = m.XS ? this.getFuncValue(m.XS, idx) : 0;
                    let v = m.XV ? this.getFuncValue(m.XV, idx) : 0;
                    let yh = m.YH ? h + this.getFuncValue(m.YH, idx % 256) : h;
                    let ys = m.YS ? s + this.getFuncValue(m.YS, idx % 256) : s;
                    let yv = m.YV ? v + this.getFuncValue(m.YV, idx % 256) : v;
                    let rgb = this.hsvToRgb(yh, ys, yv);
                    let uniformColor = [rgb.r, rgb.g, rgb.b, 255];

                    // 將算好的遮罩與顏色寫入畫布
                    for (let l = 0; l < 32; l++){
                        if (lightUp[l]){
                            // pixels[lidx] = sch.getPixelColor(idx);
                            led_show_arr[idx][l] = [...uniformColor];
                        } else {
                            // FastLED.clear(); 沒被亮起的燈塗黑
                            led_show_arr[idx][l] = [0, 0, 0, 255]; 
                        }
                    }
                }
                // showLED(); (由 for 迴圈的 idx++ 完成推進)
            }
            
            if (idx === start_idx) idx++;
        }
    }

    // p1: reverse
    //p4: space
  
    bitmap(m, map, length, led_show_arr){
        const reverse = m.p1;
        const space = m.p4;
        //setEffectStart(m);
        //while( checkDuration(m) ){
        for (let idx = 0; idx<m.duration; ){
        //console.log(`m.p1 = ${reverse}`);
            for (let i=length-1; i>=0&&idx<m.duration; i--,idx++){
                let chuse_bit = 1; 
                for(let j=0; j<32; j++){
                    if (reverse){
                        if(map[i] & chuse_bit){
                            led_show_arr[idx][j][0] = 0;
                            led_show_arr[idx][j][1] = 0;
                            led_show_arr[idx][j][2] = 0;
                        }
                    }
                    else{
                       //console.log(`m.p1 = ${map[i]}`);
                        if((~map[i]) & chuse_bit){
                            led_show_arr[idx][j][0] = 0;
                            led_show_arr[idx][j][1] = 0;
                            led_show_arr[idx][j][2] = 0;
                        }
                    }     
                    chuse_bit <<= 1;                 
                }
            }
            for (let i=0; i<space&&idx<m.duration; i++,idx++){
                 for(let j=0; j<32; j++){
                    led_show_arr[idx][j][0] = 0;
                    led_show_arr[idx][j][1] = 0;
                    led_show_arr[idx][j][2] = 0;
                 }
            }
        }
        //}
    }

    bitmapEs(m, led_show_arr){
        this.bitmap(m, Pre_view.BITMAP_ES, Pre_view.BITMAP_SIZE_ES, led_show_arr);
    }

    
   
    bitmapEsZh(m, led_show_arr){
        const reverse = m.p1;
        this.bitmap(m, Pre_view.BITMAP_ES_ZH, Pre_view.BITMAP_SIZE_ES_ZH, led_show_arr);
    }

     
    // p4: space
    
    colormap(m, colormap,  length, led_show_arr){
        const space = m.p4;
        for (let idx = 0; idx<m.duration; ){
            for (let i=length-1; i>=0&&idx<m.duration; i--,idx++){
                 for(let j=0; j<32; j++){
                   //console.log(`${(colormap[idx][6] >> 2 & 0xf8)%255}`);
                    let rgb_value = this.hsvToRgb((colormap[i][j] >> 7 & 0xf8)%255,
                                                  (colormap[i][j] >> 2 & 0xf8)%255,
                                                  (colormap[i][j] << 3 & 0xf8)%255,
                                                 );
                    led_show_arr[idx][j][0] = rgb_value.r;
                    led_show_arr[idx][j][1] = rgb_value.g;
                    led_show_arr[idx][j][2] = rgb_value.b;  
                }
            }
            for (let i=0; i<space&&idx<m.duration; i++,idx++){
                 for(let j=0; j<32; j++){
                    led_show_arr[idx][j][0] = 0;
                    led_show_arr[idx][j][1] = 0;
                    led_show_arr[idx][j][2] = 0;
                 }
            }
        }
        //setEffectStart(m);
      /*  while( checkDuration(m) ){
            for (int i=0; i<length; i++){
                uint16_t idx = getIdx();
                sch.updateHeading(idx);
                sch.getPixelColor(pixels, map[i]);
                showLED();
                    for( uint8_t i=0; i<NUMPIXELS; i++){
        pixels[i] = CHSV(
            colormap[i] >> 7 & 0xf8,
            colormap[i] >> 2 & 0xf8,
            colormap[i] << 3 & 0xf8
        );
    }
            }
            for (int j=0; j<space; j++){
                FastLED.clear();
                showLED();
            }
        }*/
    }

    colormapDna(m, led_show_arr){
        const reverse = m.p1;
        this.colormap(m, Pre_view.BITMAP_DNA, Pre_view.BITMAP_SIZE_DNA, led_show_arr);
    }

    colormapFire(m, led_show_arr){
        const reverse = m.p1;
        this.colormap(m, Pre_view.FIRE, 32, led_show_arr);
    }

    colormapBenson(m, led_show_arr){
        this.bitmap(m, Pre_view.BENSON, Pre_view.BITMAP_SIZE_BENSON, led_show_arr);
    }

     colormapYen(m, led_show_arr){
        this.bitmap(m, Pre_view.YEN, Pre_view.BITMAP_SIZE_YEN, led_show_arr);
    }

    colormapLove(m, led_show_arr){
        this.bitmap(m, Pre_view.LOVE, Pre_view.BITMAP_SIZE_LOVE, led_show_arr);
    }

    colormapGear(m, led_show_arr){
        this.colormap(m, Pre_view.GEAR, Pre_view.BITMAP_SIZE_GEAR, led_show_arr);
    }

    bitmapESXOPT(m, led_show_arr){
        this.bitmap(m, Pre_view.BITMAP_ESXOPT, Pre_view.BITMAP_SIZE_ESXOPT, led_show_arr);
    }

    static BITMAP_SIZE_ES_ZH = 89;
    static BITMAP_ES_ZH = [
        0B00000000000111100000000000000000,
        0B00000000001111110000000000000000,
        0B00000000011111111000000000000000,
        0B00000000111111111100000000000000,
        0B00000001111111111110000000000000,
        0B00000001111111111111000000000000,
        0B00000001111111111111100000000000,
        0B00000001111111111111110000000000,
        0B00000001111111111111111000000000,
        0B00000000111111111111111100000000,
        0B00000000011111111111111110000000,
        0B00000000001111111111111111000000,
        0B00000000011111111111111110000000,
        0B00000000111111111111111100000000,
        0B00000001111111111111111000000000,
        0B00000001111111111111110000000000,
        0B00000001111111111111100000000000,
        0B00000001111111111111000000000000,
        0B00000001111111111110000000000000,
        0B00000000111111111100000000000000,
        0B00000000011111111000000000000000,
        0B00000000001111110000000000000000,
        0B00000000000111100000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000011111111111111110000000,
        0B00000000111111111111111110000000,
        0B00000001111000001110000000000000,
        0B00000011110000001110000000000000,
        0B00000111100000001110000000000000,
        0B00000111000000001110000000000000,
        0B00000111100000001110000000000000,
        0B00000011110000001110000000000000,
        0B00000001111000001110000000000000,
        0B00000000111111111111111110000000,
        0B00000000011111111111111110000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000111111111111111100000000,
        0B00000001111111111111111110000000,
        0B00000001100000110000000110000000,
        0B00000001100000110000000110000000,
        0B00000001100000110000000110000000,
        0B00000001100000110000000110000000,
        0B00000001100000110000000110000000,
        0B00000001100000110000000110000000,
        0B00000001100000110000000110000000,
        0B00000001110000110000000110000000,
        0B00000001111111110000000110000000,
        0B00000000111111110000000110000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000111111110000000110000000,
        0B00000001111111111000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011000000110000000,
        0B00000001100000011111111110000000,
        0B00000001100000001111111100000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000001111111111111111110000000,
        0B00000001111111111111111110000000,
        0B00000001100000110000000000000000,
        0B00000001100000110000000000000000,
        0B00000001100000110000000000000000,
        0B00000001100000110000000000000000,
        0B00000001100000110000000000000000,
        0B00000001100000110000000000000000,
        0B00000001111111110000000000000000,
        0B00000001111111110000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000111111100000000,
        0B00000000001100001111111110000000,
        0B00000000001100001100000110000000,
        0B00000000001100001100000110000000,
        0B00000000001100001100000110000000,
        0B00000000001100001100000110000000,
        0B00000000001100001100000110000000,
        0B00000000001100001100000110000000,
        0B00000000001111111111111110000000,
        0B00000000000111111111111100000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000
    ];




    static BITMAP_SIZE_ES = 28;
    static BITMAP_ES = [
        0B00000000000000000000000000000000,
        0B00111111111111111111111111111100,
        0B00111111111111111111111111111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000000000000000111100,
        0B00000000000000000000000000000000,
        0B00000011111111000000000011110000,
        0B00001111111111110000000000111100,
        0B00111111000011110000000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000001111000000111100,
        0B00111100000000001111000011111100,
        0B00001111000000000011111111110000,
        0B00000000000000000000000000000000,
        0B00000000111111111111111000000000,
        0B00000111111111111111111111100000,
        0B00011111110000000000001111111000,
        0B00111100000000000000000000111100,
        0B00111100000000000000000000111100,
        0B00111100000000000000000000111100,
        0B0001111000000000000000000111100,
        0B00011111110000000000000111111000,
        0B00000000000000000000000000000000
    ];
    static BITMAP_SIZE_ESXOPT = 54;
    static BITMAP_ESXOPT = [
        0B00000000000000000000000000000000,
        0B00111111111111111111111111111100,
        0B00111111111111111111111111111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000000000000000111100,
        0B00000000000000000000000000000000,
        0B00000011111111000000000011110000,
        0B00001111111111110000000000111100,
        0B00111111000011110000000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000111100000000111100,
        0B00111100000000001111000000111100,
        0B00111100000000001111000011111100,
        0B00001111000000000011111111110000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000111111000000000011111100000,
        0B00000111111111000011111111100000,
        0B00000000000111111111100000000000,
        0B00000000000111111111100000000000,
        0B00000111111111000011111111100000,
        0B00000111111000000000011111100000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000111111111111111000000000,
        0B00000111111111111111111111100000,
        0B00011111110000000000001111111000,
        0B00111100000000000000000000111100,
        0B00111100000000000000000000111100,
        0B00011111110000000000000111111000,
        0B00000111111111111111111111100000,
        0B00000000111111111111111000000000,
        0B00000000000000000000000000000000,
        0B00111111111111111111111111111100,
        0B00111111111111111111111111111100,
        0B00111100000000111100000000000000,
        0B00111100000000111100000000000000,
        0B00011110000001111000000000000000,
        0B00001111000011110000000000000000,
        0B00000111111111100000000000000000,
        0B00000011111111000000000000000000,
        0B00000000000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111111111111111111111111111100,
        0B00111111111111111111111111111100,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000
    ];


    static BITMAP_SIZE_SATR = 16;
    static STAR = [
        0B00000000000000000000000000000000,
        0B00000100000000000001000000000000,
        0B00000110000000000001100000000000,
        0B00000111000011000001110000110000,
        0B00000111101111000001111011110000,
        0B00001111111110000011111111100000,
        0B00011111111100000111111111000000,
        0B01111111111000011111111110000000,
        0B01111111111000011111111110000000,
        0B00011111111100000111111111000000,
        0B00001111111110000011111111100000,
        0B00000111101111000001111011110000,
        0B00000111000011000001110000110000,
        0B00000110000000000001100000000000,
        0B00000100000000000001000000000000,
        0B00000000000000000000000000000000
        ];


    static BITMAP_SIZE_LIGHTNING = 14;
    static LIGHTNING = [
        0B00000000000000000000000001100000,
        0B00000000000000000000000011000000,
        0B00000000000000000100000110000000,
        0B00000000000000001100001100000000,
        0B00000000000000011100111000000000,
        0B00000000100001111101110000000000,
        0B00000001100011110111100000000000,
        0B00000011100111100111000000000000,
        0B00000111101111000110000000000000,
        0B00001110111100000000000000000000,
        0B00011000111000000000000000000000,
        0B00110000110000000000000000000000,
        0B01100000000000000000000000000000,
        0B11000000000000000000000000000000
    ];

    static BITMAP_SIZE_BENSON = 32
    static BENSON = [
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000111000000000000,
        0B00000000000000011000100000000000,
        0B00000000000000110000010000011000,
        0B00001111011101000100011011010100,
        0B00110000110011110100001111110100,
        0B01000000000001101010111111100100,
        0B01000111011001100101000111100100,
        0B10000111001101110100000111100100,
        0B10000111001010101111111111101000,
        0B10000000001110101001011111111000,
        0B10000000101010101000011111000000,
        0B10000001101110110100011110000000,
        0B10000000101010101000011111000000,
        0B10000000001110101001011111111000,
        0B10000111001010101111111111101000,
        0B10000111001101110100000111100100,
        0B01000111011001100101000111100100,
        0B01000000000011101010111111100100,
        0B00110000110011110100001011010100,
        0B00001111011101000100011000010100,
        0B00000000000000110000010000011000,
        0B00000000000000011000100000000000,
        0B00000000000000000111000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000,
        0B00000000000000000000000000000000
    ];

        

    static BITMAP_SIZE_YEN = 17;
    static YEN = [
        0B00000000111111111111111000000000,
        0B00000111111111111111111111100000,
        0B00011111110000000000001111111000,
        0B00111100000000000000000000111100,
        0B00111100000000000000000000111100,
        0B00011111110000000000000111111000,
        0B00000111111111111111111111100000,
        0B00000000111111111111111000000000,
        0B00000000000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111111111111111111111111111100,
        0B00111111111111111111111111111100,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000,
        0B00111100000000000000000000000000
    ];

    static BITMAP_SIZE_LOVE = 17
    static LOVE = [
        0B00000111111111100000000000000000,
        0B00011111111111111100000000000000,
        0B00111111111111111111000000000000,
        0B01111111111111111111110000000000,
        0B11111111111111111111111100000000,
        0B01111111111111111111111110000000,
        0B00111111111111111111111111100000,
        0B00011111111111111111111111111000,
        0B00000111111111111111111111111110,
        0B00011111111111111111111111111000,
        0B00111111111111111111111111100000,
        0B01111111111111111111111110000000,
        0B11111111111111111111111100000000,
        0B01111111111111111111110000000000,
        0B00111111111111111111000000000000,
        0B00011111111111111100000000000000,
        0B00000111111111100000000000000000
    ];    


static FIRE = [
    [0, 6144, 3072, 3072, 6144, 6144, 4096, 4096, 4096, 4096, 4096, 1824, 6144, 4096, 3072, 6144, 3072, 4096, 4096, 4096, 3072, 4096, 4096, 4096, 4096, 1792, 3072, 1792, 1792, 4096, 2048, 672],
    [0, 6144, 6144, 6144, 6144, 6144, 4096, 4096, 1792, 4096, 1824, 1792, 6144, 6144, 3072, 3072, 4096, 4096, 1792, 1792, 1792, 1824, 3072, 832, 2048, 1856, 864, 2048, 3072, 3072, 512, 3072],
    [6144, 6144, 6144, 9216, 6144, 4096, 4096, 4096, 3072, 2720, 4096, 4096, 4096, 6144, 3072, 6144, 4096, 4096, 5792, 1824, 1856, 1856, 864, 864, 1856, 864, 3072, 2048, 4096, 1792, 4096, 2048],
    [6144, 1024, 6144, 2048, 6144, 4096, 3840, 4096, 4096, 4096, 2720, 6144, 6144, 6144, 6144, 6144, 0, 3072, 3072, 2048, 4096, 1824, 4096, 3072, 3072, 4096, 6144, 1824, 2720, 1792, 4096, 1921],
    [0, 6144, 6144, 6144, 4096, 4096, 4096, 3072, 6144, 22528, 22528, 6144, 6144, 0, 0, 0, 0, 3072, 6144, 6144, 2048, 3072, 0, 4096, 4096, 6144, 3072, 864, 1824, 4096, 0, 672],
    [0, 6144, 3072, 6144, 2048, 3072, 6144, 22528, 0, 0, 3072, 6144, 6144, 6144, 6144, 3072, 6144, 6144, 6144, 3072, 6144, 3072, 0, 9216, 11264, 0, 0, 0, 22528, 0, 879, 903],
    [0, 6144, 11264, 4096, 3072, 22528, 0, 0, 17408, 0, 512, 3072, 6144, 6144, 6144, 6144, 6144, 3072, 4096, 3072, 4096, 4096, 11264, 898, 965, 909, 1841, 879, 941, 1916, 1947, 933],
    [0, 6144, 6144, 6144, 22528, 0, 0, 0, 0, 3072, 3072, 4096, 3072, 6144, 3072, 9216, 6144, 2048, 4096, 3072, 1824, 0, 907, 938, 937, 942, 884, 922, 950, 1887, 1030, 1024],
    [0, 6144, 0, 0, 0, 0, 0, 0, 6144, 6144, 4096, 3072, 512, 22528, 6144, 22528, 6144, 6144, 6144, 6144, 1025, 932, 965, 5632, 0, 907, 1911, 955, 1917, 1008, 1030, 1706],
    [6144, 3072, 17408, 0, 6144, 0, 0, 6144, 3072, 3072, 6144, 6144, 3072, 2848, 3840, 864, 1856, 1856, 2848, 0, 1833, 897, 5792, 608, 17408, 1005, 2720, 3648, 1853, 1886, 2656, 974],
    [3072, 3072, 6144, 6144, 6144, 0, 0, 0, 3072, 6144, 4096, 3072, 1856, 1856, 1856, 1856, 1856, 704, 769, 2048, 1866, 768, 1025, 1025, 0, 1880, 5600, 1725, 2688, 3648, 2813, 943],
    [0, 6144, 6144, 2048, 6144, 6144, 6144, 6144, 6144, 4096, 1792, 0, 768, 1824, 704, 1728, 1921, 1921, 1024, 769, 898, 0, 1915, 1881, 1024, 930, 1903, 1037, 947, 886, 891, 893],
    [0, 6144, 3072, 3072, 512, 22016, 6144, 6144, 4096, 6144, 17408, 903, 1858, 672, 1825, 1857, 1825, 0, 1735, 1025, 912, 891, 1728, 2720, 1856, 1823, 1757, 2719, 2688, 980, 1028, 967],
    [6144, 6144, 1024, 6144, 6144, 6144, 3072, 1792, 11264, 17408, 932, 914, 933, 1825, 1857, 801, 1026, 2764, 3648, 952, 1916, 1915, 1854, 1851, 1759, 1755, 1757, 1815, 1004, 1025, 866, 801],
    [6144, 6144, 11264, 512, 6144, 1921, 6144, 0, 963, 972, 976, 919, 1002, 1028, 1025, 641, 1029, 3711, 1789, 1883, 1886, 1977, 1008, 1913, 2813, 1852, 1791, 1908, 1912, 1972, 969, 802],
    [11264, 4096, 3072, 4096, 0, 1025, 1025, 918, 891, 1883, 1728, 1820, 952, 1753, 1934, 998, 1834, 3679, 3708, 2711, 2775, 1787, 890, 1886, 1824, 1824, 954, 1917, 979, 1003, 1030, 899],
    [6144, 2048, 6144, 0, 1702, 1839, 916, 840, 1027, 1001, 1035, 3648, 4704, 4608, 3552, 2589, 5504, 2782, 2783, 2720, 4640, 4640, 2720, 1788, 918, 1881, 1851, 943, 1792, 952, 974, 966],
    [6144, 1792, 3072, 0, 1024, 2784, 1822, 1030, 1025, 973, 1824, 3679, 2782, 2719, 4704, 3680, 2688, 3711, 2784, 2720, 3552, 3487, 3648, 2748, 2751, 2720, 976, 1832, 1849, 1004, 937, 576],
    [0, 3072, 866, 0, 973, 1824, 1792, 1760, 965, 1027, 2752, 2752, 2720, 3680, 3673, 873, 1751, 3708, 4627, 3602, 1720, 1917, 1853, 2781, 2720, 1792, 953, 2745, 1009, 974, 1032, 967],
    [898, 17408, 1026, 976, 927, 920, 1009, 2712, 912, 1791, 2720, 1754, 1024, 869, 1742, 1025, 1025, 1024, 1025, 1025, 1025, 1026, 976, 970, 975, 1786, 1785, 1792, 1850, 1875, 916, 1004],
    [901, 874, 1025, 971, 975, 924, 927, 906, 2715, 1780, 2688, 1776, 0, 833, 1025, 802, 1858, 770, 834, 1858, 834, 965, 922, 1915, 920, 1029, 1029, 1004, 946, 971, 964, 1955],
    [0, 929, 4096, 512, 0, 1028, 911, 0, 1820, 1755, 1781, 0, 834, 865, 1889, 865, 865, 801, 865, 865, 865, 898, 898, 901, 939, 891, 925, 975, 996, 931, 972, 946],
    [22528, 898, 6144, 6144, 6144, 11264, 22528, 0, 1777, 2720, 1740, 0, 801, 865, 1857, 865, 865, 865, 865, 865, 1921, 1857, 865, 929, 967, 1000, 1728, 1947, 1028, 17408, 22528, 0],
    [22528, 832, 1921, 0, 3072, 2048, 4096, 4096, 0, 825, 1782, 0, 864, 801, 1857, 1857, 1857, 1857, 1953, 1793, 1888, 1921, 1921, 1921, 2720, 0, 1841, 1792, 949, 969, 11264, 3072],
    [0, 22528, 0, 902, 0, 932, 1792, 4096, 0, 771, 1843, 1024, 769, 1696, 769, 1888, 2880, 1856, 1824, 1856, 672, 864, 1728, 1888, 865, 1856, 0, 925, 0, 963, 962, 0],
    [6144, 6144, 0, 909, 933, 898, 6144, 4096, 0, 1803, 1853, 1037, 0, 672, 1856, 672, 1856, 1856, 1728, 1856, 1728, 1856, 704, 1728, 1824, 1728, 608, 0, 32768, 1946, 1917, 1852],
    [6144, 6144, 4096, 0, 962, 2048, 3072, 6144, 2048, 0, 1792, 1855, 866, 5632, 1728, 1856, 1824, 1824, 1856, 1856, 1824, 3072, 3072, 3072, 3072, 1824, 3072, 1824, 1792, 0, 938, 1943],
    [17408, 6144, 3072, 0, 872, 898, 11264, 6144, 864, 0, 909, 955, 942, 22528, 1824, 4096, 3840, 3072, 5120, 3840, 6144, 1824, 1792, 3072, 4096, 4096, 1792, 4096, 1824, 2720, 0, 2625],
    [0, 6144, 6144, 11264, 866, 833, 2048, 3072, 3072, 6144, 0, 910, 933, 0, 3072, 4096, 4096, 6144, 4096, 2720, 4096, 1728, 1792, 4096, 4096, 4096, 4096, 4096, 4096, 3072, 3072, 11264],
    [6144, 6144, 6144, 6144, 11264, 6144, 2048, 3072, 2048, 3072, 4096, 0, 11264, 4096, 3072, 4096, 4096, 2848, 4096, 4096, 2048, 4096, 3072, 1824, 3072, 3072, 4096, 2048, 6144, 3072, 6144, 6144],
    [6144, 0, 6144, 6144, 2048, 4096, 6144, 4096, 4096, 6144, 6144, 3072, 3072, 3072, 6144, 3072, 2048, 3072, 4096, 3072, 1824, 704, 1728, 864, 1856, 1856, 1856, 2848, 3072, 6144, 3072, 0],
    [0, 0, 6144, 6144, 3072, 6144, 3072, 6144, 3072, 6144, 4096, 4096, 4096, 4096, 4096, 2720, 5792, 1824, 3072, 864, 3072, 1856, 1856, 1824, 1824, 1824, 1824, 3072, 1824, 6144, 6144, 0]

];

static BITMAP_SIZE_DNA = 56;
static BITMAP_DNA = [
    [0, 0, 0, 0, 0, 0, 20099, 20123, 20096, 20125, 20125, 20125, 20125, 20125, 20093, 20107, 0, 29189, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 20169, 20096, 20127, 20125, 20125, 20125, 20125, 20096, 20091, 20226, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 29124, 30250, 0, 20113, 20096, 20126, 20125, 20125, 20125, 20126, 20096, 20080, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 28106, 28128, 29152, 29178, 1025, 0, 20118, 20096, 20126, 20125, 20125, 20125, 20127, 20094, 20071, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 29133, 28128, 29215, 29215, 29216, 28128, 29175, 0, 20099, 20090, 20096, 20126, 20125, 20125, 20125, 20096, 20086, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 29131, 28096, 29152, 28128, 29152, 29183, 28125, 24997, 0, 0, 0, 20294, 20124, 20096, 20125, 20125, 20125, 20126, 20096, 20108, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 26944, 28096, 28082, 777, 874, 970, 1003, 1036, 880, 851, 852, 855, 939, 0, 20172, 20096, 20127, 20125, 20125, 20125, 20096, 20089, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 29175, 28128, 1032, 892, 858, 858, 858, 858, 858, 858, 857, 857, 859, 858, 1029, 0, 20114, 20096, 20126, 20125, 20125, 20126, 20096, 20100, 0, 0, 0, 0, 0],
    [0, 0, 28101, 28128, 29184, 1033, 892, 860, 860, 860, 860, 860, 860, 860, 860, 860, 861, 864, 857, 1027, 19266, 20123, 20128, 20125, 20125, 20125, 20096, 20070, 0, 0, 0, 0],
    [0, 0, 29178, 29216, 29184, 28116, 28107, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3072, 865, 0, 0, 20079, 20096, 20125, 20125, 20125, 20096, 20068, 0, 0, 0],
    [0, 0, 29177, 29216, 29214, 28128, 28138, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20069, 20096, 20126, 20125, 20125, 20096, 0, 0, 0],
    [0, 29186, 28102, 28128, 29184, 29211, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20092, 20127, 20125, 20128, 20074, 0, 0],
    [0, 28112, 0, 28145, 26760, 13667, 13314, 13154, 13122, 13154, 13122, 13154, 13122, 13122, 13122, 13122, 13186, 13122, 13122, 13186, 13122, 13186, 13186, 13186, 12226, 0, 20089, 20127, 20126, 20085, 0, 0],
    [0, 29172, 29200, 11265, 13209, 13174, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13141, 11264, 20091, 20126, 20093, 0, 0],
    [0, 29175, 28128, 0, 13168, 13138, 13139, 13139, 13139, 13139, 13140, 13140, 13141, 13140, 13141, 13141, 13141, 13142, 13142, 13142, 13142, 13142, 13142, 13142, 13173, 13175, 12205, 23426, 20096, 20096, 0, 0],
    [0, 29173, 29184, 29139, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20074, 20075, 21110, 20035, 20093, 20096, 0, 0],
    [0, 29172, 29184, 28128, 28067, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20075, 20096, 20127, 20096, 20076, 20087, 20122, 0, 0],
    [0, 29130, 29184, 29215, 29182, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20134, 20064, 20126, 20125, 20126, 20083, 20084, 20080, 0, 0],
    [0, 0, 28128, 29215, 29184, 29172, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20207, 20172, 20179, 20127, 20126, 20089, 20075, 0, 0, 0],
    [0, 0, 29140, 29184, 29215, 29152, 28138, 8194, 5952, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4992, 4960, 5141, 20184, 20096, 19456, 0, 0, 0, 0],
    [0, 0, 0, 28128, 29215, 29215, 28128, 25315, 6147, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4928, 4960, 4990, 5021, 5020, 5051, 5049, 5049, 5133, 20158, 20001, 0, 0, 0, 0, 0],
    [0, 0, 0, 29171, 29184, 29214, 29215, 28128, 25442, 0, 5824, 0, 0, 0, 0, 0, 0, 0, 20303, 20244, 20244, 20245, 20214, 20215, 20160, 20067, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 29182, 29215, 29215, 29215, 28128, 27140, 0, 0, 0, 0, 0, 0, 20100, 20093, 20128, 20126, 20126, 20126, 20127, 20096, 20066, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 25985, 28128, 29215, 29215, 29215, 28128, 29162, 0, 0, 0, 0, 20085, 20096, 20126, 20125, 20125, 20125, 20127, 20091, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 28103, 28128, 29215, 29215, 29215, 28128, 29171, 0, 0, 20064, 20096, 20125, 20125, 20125, 20125, 20096, 20084, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 29132, 28128, 29215, 29215, 29215, 29184, 29182, 30244, 0, 20113, 20096, 20127, 20126, 20096, 20076, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 29131, 28128, 29215, 29215, 29214, 29215, 28128, 29173, 0, 0, 20114, 20093, 20066, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 29159, 28128, 29216, 29214, 29215, 29215, 29184, 28128, 29172, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29181, 29152, 29215, 29214, 29214, 29215, 29184, 28128, 29171, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 16896, 20095, 20118, 0, 27144, 29183, 29184, 29215, 29214, 29214, 29215, 29184, 28128, 29164, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 20104, 20096, 20128, 20176, 5011, 5035, 0, 28172, 29183, 29184, 29215, 29214, 29214, 29215, 29152, 29178, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 20074, 20096, 20126, 20188, 5138, 4928, 4928, 4958, 6120, 0, 28202, 29184, 29184, 29215, 29214, 29214, 29216, 28128, 29159, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 20103, 20096, 20125, 20125, 20156, 5135, 4959, 4960, 4928, 5952, 4928, 6058, 0, 29167, 29152, 29184, 29215, 29214, 29215, 28128, 29167, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 19456, 20096, 20125, 20125, 20125, 20127, 20154, 0, 0, 0, 0, 4898, 4936, 4965, 0, 0, 29173, 28128, 29215, 29214, 29215, 29152, 29137, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 20121, 20126, 20125, 20125, 20126, 20092, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28101, 29183, 29184, 29214, 29214, 29152, 28110, 0, 0, 0, 0, 0],
    [0, 0, 20101, 20096, 20126, 20126, 20127, 20091, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29172, 29152, 29215, 29215, 28128, 28103, 0, 0, 0, 0],
    [0, 0, 20084, 20128, 20214, 20184, 20186, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29132, 28128, 29215, 29215, 29184, 0, 0, 0, 0],
    [0, 0, 20122, 838, 981, 980, 978, 849, 848, 846, 845, 843, 842, 840, 839, 837, 836, 834, 1024, 0, 0, 0, 0, 0, 27047, 28128, 29215, 29184, 29140, 0, 0, 0],
    [0, 0, 20178, 1010, 860, 859, 859, 859, 859, 859, 859, 859, 859, 859, 859, 859, 860, 860, 860, 860, 860, 859, 858, 859, 1025, 27048, 29152, 29215, 28128, 28068, 0, 0],
    [0, 0, 20134, 28007, 942, 846, 848, 850, 851, 852, 853, 855, 857, 858, 859, 860, 860, 860, 860, 860, 860, 859, 859, 859, 862, 0, 29174, 29216, 29216, 29173, 0, 0],
    [0, 20100, 20068, 20127, 20177, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 801, 802, 836, 837, 839, 841, 843, 902, 0, 28128, 29215, 29184, 0, 0],
    [0, 20162, 20084, 20040, 20070, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29174, 29216, 29152, 0, 0],
    [0, 22528, 20064, 0, 20098, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29161, 29141, 28103, 29184, 29184, 0, 0],
    [0, 0, 20064, 20075, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29184, 29184, 0, 28096, 29178, 0, 0],
    [0, 0, 20096, 20095, 0, 5025, 6144, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 27152, 28191, 28096, 0, 29184, 29162, 0, 0],
    [0, 20064, 20096, 20127, 20114, 1024, 5920, 4928, 4928, 4928, 4928, 4928, 4928, 4960, 4959, 4957, 4956, 4956, 4955, 4954, 4952, 4951, 4951, 4949, 5010, 6155, 28182, 28105, 28117, 0, 0, 0],
    [0, 0, 20096, 20125, 20096, 20484, 5033, 4957, 4956, 4956, 4958, 4958, 4959, 4928, 4960, 4928, 4928, 4928, 4928, 4928, 4928, 4960, 4960, 4960, 4960, 6016, 31115, 28140, 31329, 0, 0, 0],
    [0, 0, 20096, 20125, 20125, 20094, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28102, 29100, 29131, 30091, 29098, 28158, 0, 0, 0, 0, 0],
    [0, 0, 20093, 20125, 20125, 20127, 20086, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 28138, 28128, 29184, 29184, 29184, 28096, 29163, 0, 0, 0, 0, 0],
    [0, 0, 20085, 20126, 20125, 20125, 20096, 20075, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29170, 28128, 29215, 29215, 29215, 28128, 29166, 0, 0, 0, 0, 0, 0],
    [0, 0, 20066, 20096, 20125, 20125, 20125, 20096, 20068, 0, 0, 0, 0, 0, 0, 0, 0, 26049, 29180, 29184, 29215, 29214, 29216, 28128, 28102, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 20082, 20127, 20125, 20125, 20125, 20096, 20065, 0, 0, 0, 0, 0, 0, 29136, 28128, 29216, 29214, 29215, 29184, 29179, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 20094, 20125, 20125, 20125, 20125, 20096, 20034, 0, 0, 0, 28110, 29184, 29184, 29215, 29214, 29215, 28128, 29136, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 20068, 20096, 20125, 20125, 20125, 20125, 20096, 20131, 0, 28096, 29184, 29215, 29214, 29215, 29184, 29182, 28100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 20077, 20096, 20125, 20125, 20125, 20125, 20096, 20168, 0, 29180, 29184, 29216, 28128, 29138, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 20080, 20127, 20125, 20125, 20125, 20125, 20096, 20113, 0, 29171, 29177, 27042, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];


static BITMAP_SIZE_GEAR = 40
static GEAR= [
    [28672, 29697, 864, 11264, 11264, 11265, 19457, 20482, 19457, 20480, 31745, 23552, 19459, 17042, 17201, 16333, 16392, 17409, 11264, 32514, 29696, 26242, 22528, 24576, 29696, 27648, 25601, 22529, 21504, 21504, 24577, 25601],
    [27521, 27648, 30720, 11264, 12289, 13313, 16970, 16785, 18434, 19457, 21121, 20481, 19459, 16920, 17077, 17013, 15799, 16385, 15360, 1025, 28673, 24576, 25600, 28289, 1024, 29696, 26624, 25600, 0, 0, 25600, 24576],
    [27648, 27521, 27649, 21505, 17411, 15922, 16982, 17014, 17008, 18434, 16385, 17410, 17072, 17014, 17079, 17109, 16980, 16386, 11264, 1025, 29696, 23552, 29696, 1024, 11264, 11264, 1024, 1024, 1024, 1024, 11264, 11264],
    [0, 24384, 27553, 21505, 17004, 16981, 17175, 17175, 16983, 17134, 17196, 17040, 17014, 17111, 17174, 17111, 17076, 17411, 15360, 0, 17409, 18433, 21505, 22528, 11264, 11264, 11264, 1024, 1024, 1024, 11264, 11264],
    [13312, 11264, 31744, 19457, 16386, 15895, 17174, 17176, 17112, 17111, 17079, 17110, 17175, 17176, 17207, 17143, 17078, 18439, 18434, 17410, 16387, 17038, 17255, 19457, 11264, 11264, 11264, 11264, 11264, 11264, 11264, 11264],
    [11264, 11264, 31745, 19456, 16386, 17199, 17143, 17239, 17175, 17143, 17142, 17079, 17111, 17112, 17143, 17174, 17111, 16984, 17133, 16945, 16983, 17045, 16855, 18434, 14337, 11264, 11264, 11264, 21504, 22528, 1024, 1024],
    [11264, 11264, 1024, 20481, 18434, 17074, 17111, 17175, 17141, 16983, 16917, 17009, 18095, 18034, 16983, 17047, 17143, 17143, 17047, 17141, 17206, 17175, 17076, 16945, 17409, 22528, 25600, 25601, 25601, 26625, 30721, 1025],
    [12289, 13313, 18433, 19458, 17134, 16983, 17142, 17110, 15894, 16391, 17410, 19458, 21507, 21507, 19459, 17292, 17015, 17111, 17175, 17176, 17208, 17174, 16983, 15889, 17408, 23552, 26624, 25601, 25601, 26625, 31744, 1024],
    [17288, 16790, 16884, 17043, 17078, 17110, 17111, 17013, 17410, 16384, 11264, 11264, 26624, 23552, 19456, 17409, 16389, 16918, 17143, 17145, 17143, 16952, 17100, 14337, 11264, 31296, 23552, 24576, 25600, 24097, 11264, 11264],
    [17293, 16983, 16085, 17142, 17112, 17142, 17047, 17415, 18433, 1024, 1024, 1024, 1025, 1025, 1024, 11264, 12289, 16107, 17047, 17176, 17111, 17261, 17409, 11264, 8000, 1024, 25184, 24097, 30720, 0, 11264, 11266],
    [17171, 17110, 17206, 17206, 17175, 17047, 17011, 18435, 18432, 1024, 11264, 11264, 1024, 1024, 11264, 11264, 11265, 14337, 16984, 17175, 17112, 17325, 16386, 12289, 1024, 1024, 31296, 1024, 1024, 2657, 11264, 11264],
    [17137, 16953, 17110, 17174, 17174, 17016, 18093, 20482, 15360, 11264, 11264, 11264, 11264, 11264, 11264, 11264, 11264, 15362, 17169, 17176, 17112, 17138, 16386, 14337, 17408, 19777, 1024, 1024, 1025, 1024, 8192, 11264],
    [20482, 19458, 17260, 17014, 17112, 18071, 19180, 21506, 11264, 11264, 11264, 11264, 15360, 22528, 22529, 25600, 2048, 17409, 18193, 17113, 17175, 17111, 15926, 16108, 17410, 18433, 24256, 31649, 29696, 22528, 14849, 11264],
    [24577, 21505, 17410, 16918, 17142, 17080, 18062, 21506, 11264, 11264, 11264, 11264, 21504, 22528, 22529, 22529, 25600, 18433, 17107, 17176, 17143, 17143, 17110, 17013, 16791, 17411, 21504, 1024, 22016, 21504, 21504, 17408],
    [24384, 20480, 16386, 15984, 17142, 17174, 16947, 18434, 11264, 1024, 19456, 22528, 29696, 29696, 22528, 21504, 20480, 18434, 17048, 17239, 17143, 17111, 17143, 17110, 16886, 18434, 13312, 11264, 17408, 19457, 22528, 23552],
    [15360, 17409, 16386, 16048, 16118, 17206, 16983, 17416, 15361, 19456, 22529, 22529, 27648, 1024, 15360, 17408, 19457, 17037, 17111, 17207, 17079, 17015, 17079, 17015, 16976, 16385, 12289, 11264, 11264, 21504, 26624, 29697],
    [15360, 16386, 17010, 17079, 17143, 17175, 17175, 17015, 17412, 18433, 21506, 22530, 22528, 20480, 20480, 18433, 17321, 16951, 17143, 17143, 16980, 17385, 17259, 16013, 15047, 11265, 11264, 10240, 13313, 19456, 31745, 1025],
    [14337, 16753, 17014, 17111, 17142, 17143, 17208, 17143, 16918, 17131, 19460, 20483, 18434, 17409, 17410, 17006, 16951, 17110, 17175, 16985, 17413, 18433, 16385, 11265, 11265, 6148, 5125, 1025, 11264, 7169, 1025, 1025],
    [16385, 17412, 16983, 17110, 17046, 17047, 17111, 17174, 16150, 17110, 16984, 17012, 17073, 15987, 17015, 17078, 17174, 17143, 17174, 17167, 12289, 2049, 1025, 2050, 3075, 4606, 3704, 1027, 2049, 5926, 2048, 2048],
    [17408, 17409, 17134, 16920, 16917, 17418, 17293, 16983, 17174, 17238, 17143, 17080, 17110, 16085, 17142, 17174, 17175, 17206, 17143, 15958, 14337, 2050, 2454, 3079, 5134, 4764, 4732, 4049, 4696, 4476, 4744, 10240],
    [30016, 21504, 19458, 18310, 19457, 18434, 17409, 17413, 17076, 17143, 17143, 17175, 17173, 16023, 17013, 16983, 17111, 17175, 17207, 17079, 17225, 7435, 3581, 3741, 4669, 4696, 4790, 3647, 4796, 4730, 3074, 3072],
    [1024, 23552, 21505, 20481, 22528, 3840, 11264, 17409, 17135, 17111, 17175, 17175, 17045, 17229, 17257, 18435, 16949, 17078, 17143, 17014, 15762, 11265, 4855, 4767, 5129, 3074, 1026, 1027, 4827, 4795, 2051, 1025],
    [23552, 22241, 19457, 18432, 11264, 9953, 11264, 14337, 16081, 17111, 17270, 17111, 17008, 20482, 25600, 22305, 19458, 16790, 16886, 15052, 11265, 5124, 4668, 4852, 1026, 1025, 11264, 2048, 4104, 3646, 4733, 4732],
    [23392, 22529, 21504, 18432, 11264, 11264, 11264, 14337, 15763, 15893, 15991, 16918, 18435, 31082, 32300, 32456, 23297, 17285, 17411, 11265, 5804, 4605, 4701, 5102, 1026, 1024, 21505, 8192, 1027, 3678, 4764, 5012],
    [30720, 29696, 21312, 22528, 2048, 1025, 25600, 29697, 1026, 451, 16006, 15753, 1027, 408, 538, 533, 1026, 22528, 20480, 11264, 6148, 4724, 4764, 4856, 1026, 2049, 1024, 1025, 4108, 4767, 4102, 3074],
    [6144, 1024, 29984, 31520, 1024, 30720, 26625, 1027, 531, 472, 1029, 1029, 845, 571, 667, 694, 1029, 1027, 1028, 1864, 1026, 1026, 4109, 4766, 4946, 3074, 2050, 4105, 4797, 4797, 4719, 3072],
    [11264, 11264, 1024, 1024, 13312, 19456, 27649, 32236, 539, 699, 636, 636, 636, 699, 731, 668, 692, 879, 569, 505, 2055, 1027, 4757, 4731, 4701, 4701, 4733, 4732, 4793, 4603, 5434, 4096],
    [11265, 11264, 1024, 1024, 13312, 17409, 28672, 1028, 696, 765, 733, 669, 604, 602, 603, 635, 636, 605, 698, 569, 372, 1027, 4812, 4571, 4103, 4947, 4764, 4855, 3074, 5123, 6146, 7168],
    [11264, 3072, 31745, 30720, 19456, 15360, 1024, 1027, 758, 732, 571, 721, 1028, 1027, 1029, 940, 602, 698, 667, 567, 1026, 11264, 3073, 1025, 2050, 1026, 3485, 3696, 1025, 1024, 6144, 9216],
    [22528, 24384, 30720, 1025, 1024, 1026, 1028, 938, 572, 604, 813, 1027, 1024, 6144, 1025, 1027, 1032, 571, 635, 879, 1027, 1024, 674, 1024, 1024, 1025, 1025, 1025, 1024, 24386, 23552, 22528],
    [21314, 22528, 11264, 2049, 1026, 1584, 539, 604, 634, 536, 1028, 1025, 0, 21504, 25600, 1026, 1028, 624, 602, 666, 1033, 1029, 1026, 30721, 27649, 24256, 11264, 11264, 11264, 20224, 1024, 1025],
    [21505, 20480, 11264, 2049, 1027, 562, 603, 667, 634, 627, 1026, 1024, 22529, 22529, 22241, 1024, 1025, 778, 603, 668, 634, 1498, 965, 31745, 22529, 22529, 16257, 11264, 15105, 11264, 4096, 1024],
    [11264, 11264, 11264, 2048, 1025, 743, 625, 570, 635, 1747, 1026, 31105, 22529, 23426, 22529, 1024, 1026, 1899, 604, 669, 634, 474, 1028, 1025, 11264, 21504, 24577, 26624, 28672, 29696, 11264, 11264],
    [11264, 11137, 1024, 1024, 25184, 1025, 1029, 877, 666, 602, 1029, 1025, 31745, 26624, 1024, 1025, 1027, 1620, 603, 32378, 659, 1585, 1026, 1024, 11264, 18432, 24577, 26625, 28672, 29696, 11264, 11264],
    [1024, 1024, 30721, 29697, 22528, 2881, 1026, 1030, 636, 669, 596, 1029, 1026, 1024, 1026, 1027, 1839, 570, 602, 972, 1027, 2048, 2048, 11264, 11264, 15360, 19456, 22528, 19456, 11264, 1024, 1024],
    [1024, 31745, 29696, 27648, 1, 1024, 1025, 1493, 666, 699, 571, 534, 1867, 1030, 1898, 595, 602, 665, 540, 1031, 1025, 12289, 19456, 23552, 17408, 11264, 11264, 11264, 11264, 11264, 1024, 31744],
    [1024, 1024, 31392, 1024, 1024, 1025, 1894, 1463, 569, 603, 571, 571, 635, 636, 603, 603, 635, 636, 32379, 32312, 1026, 20224, 27648, 27649, 22528, 11264, 1024, 1024, 11264, 11264, 17408, 21504],
    [2048, 1024, 25600, 0, 11264, 1025, 1026, 967, 1493, 1032, 1032, 692, 700, 701, 636, 663, 943, 538, 32283, 32278, 1026, 20224, 29697, 29697, 22528, 11264, 1024, 1024, 1024, 11264, 21504, 19456],
    [1024, 30720, 23552, 22305, 21504, 14912, 1024, 1026, 1026, 1026, 1025, 1030, 572, 668, 32310, 1029, 1027, 1028, 32208, 1028, 6144, 11264, 5120, 1024, 11264, 11264, 1024, 1024, 1024, 25600, 22528, 22528],
    [31617, 27648, 22529, 21409, 19456, 18432, 21504, 22528, 31296, 0, 11264, 1027, 601, 603, 32461, 1028, 1024, 3072, 1026, 1026, 11264, 11265, 11264, 11264, 11264, 11264, 1024, 30720, 29696, 29696, 25600, 25600]
];

}
customElements.define("pre-view", Pre_view);

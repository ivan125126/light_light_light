#include "modes.h"
#include "ConfigManager.h"

#define LIMIT_OUTPUT(x) ((x)>0xff)?0xff:((x)<0?0:(x))


ColorScheduler::ColorScheduler(uint16_t _effect_entry_time, uint8_t defaultV){
    effect_entry_time = _effect_entry_time;
    effect_start_idx = 0;
    defaultValue = defaultV;
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
uint16_t ColorScheduler::calc_ramp(uint16_t idx, uint8_t range, uint8_t lower, uint8_t upper, bool overflow){
    uint8_t mod = idx % range;
    int16_t output = lower + (uint16_t)mod * (upper - lower) / range;
    return (!overflow)?LIMIT_OUTPUT(output):output;
    //return (!overflow && output > 0xff) ? 255 : output;
}

/* Create triangular-like function 
 *   / \   /    upper
 *  /   \ /
 * +     +      lower
 * |range|
 */ 
uint16_t ColorScheduler::calc_tri(uint16_t idx, uint8_t range, uint8_t lower, uint8_t upper, bool overflow){
    uint8_t delta = upper - lower;
    uint8_t half = range / 2;
    int16_t mod = idx % range;
    uint16_t output = lower + abs((int16_t)mod - half) * delta / half;
    return (!overflow)?LIMIT_OUTPUT(output):output;
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
uint16_t ColorScheduler::calc_pulse(uint16_t idx, uint8_t range, uint8_t lower, uint8_t top){
    uint8_t mod = idx - (idx/range) * range;
    if (mod < top) return 0xff;
    uint16_t decay = (uint16_t)(idx - top) * 8 / range;
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
uint16_t ColorScheduler::calc_step(uint16_t idx, uint8_t range, uint8_t lower, uint8_t step, uint8_t num, bool overflow){
    uint8_t state = ((int)idx % (range * num)) / range;
    uint16_t output = lower + step * state;
    return output;
    //return (!overflow && output > 0xff) ? 255 : output;
}
void ColorScheduler::SetXHsvParam(ValueParam H, ValueParam S, ValueParam V){
    XHp = H; XSp = S; XVp = V;
}

void ColorScheduler::SetYHsvParam(ValueParam H, ValueParam S, ValueParam V){
    YHp = H; YSp = S; YVp = V;
}

/* Return function value according to the parameter
 * See also @SchedulerFunc in core.h             */
uint16_t ColorScheduler::getFuncValue(ValueParam* vp, uint16_t idx, bool overflow){
    switch (vp->func){
        case FuncConst:
            return vp->p1;
        case FuncRamp:
            return calc_ramp(idx, vp->range, vp->lower, vp->p1, true);
        case FuncTri:
            return calc_tri(idx, vp->range, vp->lower, vp->p1, true);
        case FuncPulse:
            return calc_pulse(idx, vp->range, vp->lower, vp->p1);
        case FuncStep:
            return calc_step(idx, vp->range, vp->lower, vp->p1, vp->p2, true);
        default:
            return defaultValue;
    }
}

void ColorScheduler::updateHeading(uint16_t idx, bool restart){
    time_t delta=0;
    if (restart)    delta = idx - effect_start_idx;
    else            delta = idx - 0;

    headingColor.h = getFuncValue(&XHp, delta);
    headingColor.s = getFuncValue(&XSp, delta);
    headingColor.v = getFuncValue(&XVp, delta);
}

CRGB inline ColorScheduler::getPixelColor(uint8_t y){
    return CHSV(headingColor.h + getFuncValue(&YHp, y),
                headingColor.s + getFuncValue(&YSp, y),
                headingColor.v + getFuncValue(&YVp, y));
}

void ColorScheduler::getPixelColor(CRGB* pixels, uint32_t bitmap, CHSV replace){
    for( uint8_t i=0; i<NUMPIXELS_DEFAULT; i++){
        if (bitmap & 1)
            pixels[i] = getPixelColor(i);
        else pixels[i] = replace;
        bitmap = bitmap >> 1;
    }
}

void ColorScheduler::getPixelColor(CRGB* pixels){
    for( uint8_t i=0; i<NUMPIXELS_DEFAULT; i++){
        pixels[i] = getPixelColor(i);
    }
}

void ColorScheduler::getPixelColor(CRGB* pixels, const uint16_t* colormap){
    for( uint8_t i=0; i<NUMPIXELS_DEFAULT; i++){
        pixels[i] = CHSV(
            colormap[i] >> 7 & 0xf8,
            colormap[i] >> 2 & 0xf8,
            colormap[i] << 3 & 0xf8
        );
    }
}

/************************************
 *        Buffer manutation
 ************************************/
Effects::Effects():buffer(sizeof(Mode), QUEUE_SIZE, FIFO),
    sch(millis(), 0){
    effect_id = 0;
    FastLED.addLeds<WS2812B, PIN_LED, GRB>(pixels, NUMPIXELS_DEFAULT);
}

int16_t Effects::checkBufferAvailable(){
    #ifdef DEBUGGER
      Serial.print("Capacity: ");
      Serial.println(buffer.getCount());
    #endif
    if (buffer.isFull()) return -1;
    return effect_id;     // Request for next effect
}

void Effects::feedNewEffect(Mode* m){
    if (buffer.isFull()) return;
    if (buffer.push(m) )
        effect_id += 1;
        Serial.println("Pushed");
        if (effect_id >= 100)
            effect_id = 0;
}

void Effects::update(){
    // detector.update();
}

/************************************
 *        Time scheduler
 ************************************/
void Effects::setMusicTime(time_t t){
    if(t == 0 - 1) return;
    last_music_update_time = millis();
    current_music_time = t;
}

time_t Effects::getMusicTime(){
    return current_music_time + (millis() - last_music_update_time);
}

void Effects::lightOnOneLED(CRGB l){
    pixels[0] = l;
    showLED();
}

void Effects::lightOnOneLED(CRGB l, int num){
    for(int i = 0; i < num; i++)
      pixels[i] = l;
    showLED();
}
/*  Perform the effect from buffer */
void Effects::perform(){
    if (force_mode == 2){
      effect_id = 0;
      buffer.clean();
    }
    if (buffer.isEmpty()) {
      clear();
      lightOnOneLED(CHSV(130, 200 ,55));
      return;
      }
    Mode m;
    buffer.peek(&m);
    if (m.start_time < getMusicTime() || force_mode == 1){
        // Load new mode
        buffer.pop(&m);
        Serial.print("Now Performing: ");
        Serial.println(m.mode);
        switch(m.mode){
            case MODES_CLEAR:  clear(&m);  break;
            case MODES_PLAIN:  plain(&m);  break;
            case MODES_SQUARE: square(&m); break;
            case MODES_SICKLE: sickle(&m); break;
            case MODES_FAN:    fan(&m);    break;
            case MODES_BOXES:  boxes(&m);  break;
            case MODES_MAP_ES:     bitmapEs(&m);    break;
            case MODES_MAP_ES_ZH:  bitmapEsZh(&m);    break;
            case MODES_CMAP_DNA:    colormapDna(&m);    break;
            case MODES_CMAP_FIRE:    colormapFire(&m);    break;
            case MODES_CMAP_BENSON: colormapBenson(&m);    break;
            case MODES_CMAP_YEN:    colormapYen(&m);       break;
            case MODES_CMAP_LOVE:   colormapLove(&m);      break;
            case MODES_CMAP_GEAR:   colormapGear(&m);      break;
            case MODES_MAP_ESXOPT:  bitmapESXOPT(&m);    break;
            default: clear(); break;
        }
    }
    else{
      clear();
      lightOnOneLED(CHSV(130, 200 ,55));
    }
}

/************************************
 *        Effect Helper
 ************************************/
/* Block until pass through start position */
void Effects::blockUntilStart(time_t start, uint16_t timeout){
    time_t start_time = millis();
    // while( detector.read_flag() != Rotation_SET && (millis()-start_time < timeout)) 
    //     ;
    // detector.clear_flag();
}

bool inline Effects::detectPassStart(time_t start){
    // if ( detector.read_flag() ){
    //     detector.clear_flag();
    //     return true;
    // }
    return false;
}

/* It should be called to initialize the color scheduler */
void Effects::setEffectStart(Mode* m){
    time_idx = 0;
    effect_entry_time = millis();
    sch.effect_entry_time = effect_entry_time;
    sch.SetXHsvParam(m->XH, m->XS, m->XV);
    sch.SetYHsvParam(m->YH, m->YS, m->YV);
}

void Effects::setEffectBlockStart(){
    sch.effect_start_idx = time_idx;
}

/* Get the X direction index while effect performing */
uint16_t Effects::getIdx(){
    time_idx++;
    return time_idx;
}

/* Check whether to stop */
bool Effects::checkDuration(Mode* m){
    //Serial.println(getMusicTime());
    time_t current_time = getMusicTime();
    
    // Use latency threshold to prevent premature buffer clearing
    // Only abort if we're REALLY early (beyond the threshold)
    if (current_time + configManager.data.latency_threshold < m->start_time) {
        force_mode = 2;
        return false;
    }
    while (force_mode == 3){
        delay(100);
    }
    return (force_mode!=2 && current_time < m->start_time + m->duration);
}

void inline Effects::showLED(){
    FastLED.show();
}

/************************************
 *              Effects
 ************************************/
void Effects::clear(){
    FastLED.clear();
    showLED();
}
void Effects::clear(Mode* m){
    Serial.println("Clear");
    setEffectStart(m);
    FastLED.clear();
    showLED();
    while( checkDuration(m) ){
    }
}
void Effects::plain(Mode* m){
    Serial.println("Plain");
    setEffectStart(m);
    while( checkDuration(m) ){
        uint16_t idx = getIdx();
        sch.updateHeading(idx);
        sch.getPixelColor(pixels);
        showLED();
    }
}

void Effects::square(Mode* m){
    Serial.println("Square");
    uint8_t boxsize = m->param[2];
    setEffectStart(m);
    while( checkDuration(m) ){
        setEffectBlockStart();
        for (int b=1; b<boxsize; b++){
            uint32_t map = 0;

            uint32_t unit = ((uint32_t)0x1<<b) - 1;
            for (int k=0; k<boxsize/b; k++)
                map |= unit << (2*k);
            
            for (int j=0; j<boxsize/b; j+=2){
                uint16_t idx = getIdx();
                sch.updateHeading(idx);
                sch.getPixelColor(pixels, map, CHSV(0, 0, 0));
                showLED();
                map ^= map;
            }
        }
    }
}

void Effects::boxes(Mode* m){
    Serial.println("Boxes");
    uint8_t boxsize = m->param[2];
    uint8_t space = m->param[3];
    setEffectStart(m);
    while( checkDuration(m) ){
        setEffectBlockStart();
        for (int b=1; b<boxsize; b++){
            uint32_t map = 0;

            uint32_t unit = (((uint32_t)0x1<<b) - 1) << ((NUMPIXELS_DEFAULT - b)/2);
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
    }
}

void Effects::sickle(Mode* m){
    Serial.println("Sickle");
    uint8_t position_fix = m->param[0];
    uint8_t width = m->param[2];
    uint8_t space = m->param[3];
    setEffectStart(m);
    while( checkDuration(m) ){
        setEffectBlockStart();
        FastLED.clear();
        for (int b=1; b<width; b++){
            uint16_t idx = getIdx();
            sch.updateHeading(idx);
            uint8_t led_idx = NUMPIXELS_DEFAULT * b / width;
            for (int l=(NUMPIXELS_DEFAULT * (b-1) / width); l < NUMPIXELS_DEFAULT * b / width; l++)
                pixels[l] = sch.getPixelColor(l);
            showLED();
        }
        for (int j=0; j<space; j++){
            FastLED.clear();
            showLED();
        }
    }
}

void Effects::fan(Mode* m){
    Serial.println("Sickle");
    uint8_t width = m->param[0];
    uint8_t density = m->param[2];
    uint8_t thickness = m->param[3];
    setEffectStart(m);
    while( checkDuration(m) ){
        for (int w=0; w<width; w++){
            uint16_t idx = getIdx();
            sch.updateHeading(idx);

            FastLED.clear();
            uint8_t led_idx = (NUMPIXELS_DEFAULT * w / width) % density;
            for (int d=0; d<=NUMPIXELS_DEFAULT/density; d++){
                for (int t=0; t<thickness; t++){
                    uint16_t lidx = led_idx + d * density + t;
                    if (lidx < NUMPIXELS_DEFAULT)
                    pixels[lidx] = sch.getPixelColor(idx);
                }
            }
            showLED();
        }
    }
}

/* p1: reverse
 * p4: space
 */
void Effects::bitmap(Mode* m, const uint32_t* map, int length){
    uint8_t reverse = m->param[0];
    uint8_t space = m->param[3];
    setEffectStart(m);
    while( checkDuration(m) ){
        for (int i=length-1; i>=0; i--){
            uint16_t idx = getIdx();
            sch.updateHeading(idx);
            if (reverse)
                sch.getPixelColor(pixels, ~map[i], CHSV(0, 200, 0));
            else
                sch.getPixelColor(pixels, map[i], CHSV(0, 200, 0));
            showLED();
        }
        for (int j=0; j<space; j++){
            FastLED.clear();
            showLED();
        }
    }
}

void Effects::bitmapEs(Mode* m){
    bitmap(m, BITMAP_ES, BITMAP_SIZE_ES);
}

/*
 */
void Effects::bitmapEsZh(Mode* m){
    uint8_t reverse = m->param[0];
    bitmap(m, BITMAP_ES_ZH, BITMAP_SIZE_ES_ZH);
}

/* 
 * p4: space
 */
void Effects::colormap(Mode* m, const uint16_t (*map)[NUMPIXELS_DEFAULT], int length){
    uint8_t space = m->param[3];
    setEffectStart(m);
    while( checkDuration(m) ){
        for (int i=0; i<length; i++){
            uint16_t idx = getIdx();
            sch.updateHeading(idx);
            sch.getPixelColor(pixels, map[i]);
            showLED();
        }
        for (int j=0; j<space; j++){
            FastLED.clear();
            showLED();
        }
    }
}

void Effects::colormapDna(Mode* m){
    uint8_t reverse = m->param[0];
    colormap(m, BITMAP_DNA, BITMAP_SIZE_DNA);
}

void Effects::colormapFire(Mode* m){
    uint8_t reverse = m->param[0];
    colormap(m, FIRE, 32);
}

void Effects::colormapBenson(Mode* m){
    bitmap(m, BENSON, BITMAP_SIZE_BENSON);
}

void Effects::colormapYen(Mode* m){
    bitmap(m, YEN, BITMAP_SIZE_YEN);
}

void Effects::colormapLove(Mode* m){
    bitmap(m, LOVE, BITMAP_SIZE_LOVE);
}

void Effects::colormapGear(Mode* m){
    colormap(m, GEAR, BITMAP_SIZE_GEAR);
}

void Effects::bitmapESXOPT(Mode* m){
    bitmap(m, BITMAP_ESXOPT, BITMAP_SIZE_ESXOPT);
}


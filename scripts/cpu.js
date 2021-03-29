class CPU{
    constructor(renderer,keyboard,speaker){
        this.renderer = renderer;
        this.keyboard = keyboard;
        this.speaker = speaker;

        //memory 4kb
        this.memory = new Uint8Array(4096);
        //16 8-bit registers
        this.v = new Uint8Array(16);

        //stores memory addresses
        this.i = 0;

        //timers
        this.delayTimer = 0;
        this.soundTimer = 0;

        //program counter. stores the currently executing address.
        this.pc = 0x200;

        //dont initialize this with a size in order to avoid empty results.
        this.stack = new Array();

        //some instructions require pausing, such as FX0A
        this.paused = false;
        this.speed = 10;
    }
    loadSpritesIntoMemory(){
        const sprites = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F 
        ];

        //stored in the interpreter section of the memory
        for(let i = 0; i < sprites.length; i++){
            this.memory[i] = sprites[i];
        }
    }
    loadProgramintoMemory(program){
        for (let loc = 0; loc < program.length; loc++) {
            this.memory[0x200 + loc] = program[loc];
            
        }
    }
    loadRom(romName){
        var request = new XMLHttpRequest;
        var self = this;

        //handles response received from sending our request
        request.onload = function (){
            //if the request response has content
            if(request.response){
                let program = new Uint8Array(request.response);

                //load rom into memory
                self.loadProgramintoMemory(program);
            }
        }

        //initialize a GET request to retrieve the ROM from our roms folder
        request.open('GET', 'roms/' + romName);
        request.responseType = 'arraybuffer';

        //send the GET request
        request.send();

    }
    cycle(){
        for (let i = 0; i < this.speed; i++){
            if(!this.paused){
                let opcode = (this.memory[this.pc] << 8 | this.memory[this.pc + 1]);
                this.executionInstruction(opcode);
            }
        }
        if(!this.paused){
            this.updateTimers();
        }
        this.playSound();
        this.renderer.render();
    }
    updateTimers(){
        if(this.delayTimer > 0){
            this.delayTimer -=1;
        }
        if(this.soundTimer > 0){
            this.soundTimer -= 1;
        }
    }
    playSound(){
        if(this.soundTimer > 0){
            this.speaker.play(440);
        }else{
            this.speaker.stop();
        }

    }

    executionInstruction(opcode){
        this.pc +=2;
        let x = (opcode & 0x0f00) >> 8;
        let y = (opcode & 0x00f0) >> 4;

        switch (opcode & 0xF000) {
            case 0x0000:
                switch (opcode & 0x00FF) {
                    case 0x00E0://clear display
                        this.renderer.clear();
                        break;
                    case 0x00EE://return from subroutine
                        this.pc = this.stack.pop();
                        break;
                }
        
                break;
            case 0x1000://jump to address nnn
                this.pc = (opcode & 0x0fff);
                break;
            case 0x2000: //call at address nnn : ie last 12bits 
                this.stack.push(this.pc);
                this.pc = (opcode & 0x0fff);
                break;
            case 0x3000://move to next inst if vx is equal to kk : ie last 8 bits
                if(this.v[x] === (opcode & 0x00ff)){
                    this.pc +=2;
                }
                break;
            case 0x4000://move to next inst if vx is not equal to kk: ie last 8 bits
                if(this.v[x] !== (opcode & 0x00ff)){
                    this.pc +=2;
                }
                break;
            case 0x5000: // skip next instruction if Vx = Vy
                if(this.v[x] === this.v[y]){
                    this.pc +=2;
                }
                break;
            case 0x6000: // set value of kk to register Vx
                this.v[x] = (opcode & 0x00ff);
                break;
            case 0x7000: //add value kk to value of Vx and set result to register Vx
                this.v[x] += (opcode & 0x00ff);
                break;
            case 0x8000:
                switch (opcode & 0x000F) {
                    case 0x0: //set Vx to Vy
                        this.v[x] = this.v[y];
                        break;
                    case 0x1: // set Vx to Vx OR Vy
                        this.v[x]  |= this.v[y];
                        break;
                    case 0x2: // set Vx to Vx AND Vy
                        this.v[x] &= this.v[y];
                        break;
                    case 0x3: // set Vx to Vx XOR Vy
                        this.v[x] ^= this.v[y];
                        break;
                    case 0x4:
                        this.v[0xf] = 0;
                        if((this.v[x] + this.v[y]) > 0xff){
                            this.v[0xf] = 1;
                        }
                        this.v[x] += this.v[y];
                        break;
                    case 0x5:
                        this.v[0xf] = 0;
                        if(this.v[x] > this.v[y]){
                            this.v[0xf] = 1;
                        }
                        this.v[x] -= this.v[y];
                        break;
                    case 0x6:
                        this.v[0xf] = (this.v[x] & 0x1);
                        this.v[x] >>= 1; //same as vx /=2
                        break;
                    case 0x7:
                        this.v[0xf] = 0;
                        if(this.v[y] > this.v[x]){
                            this.v[0xf] = 1;
                        }
                        this.v[x] = this.v[y] - this.v[x];
                        break;
                    case 0xE:
                        this.v[0xf] = (this.v[x] & 0x80);
                        this.v[x] <<= 1; //same as vx *=2 
                        break;
                }
        
                break;
            case 0x9000:
                if(this.v[x] !== this.v[y]){
                    this.pc +=2;
                }
                break;
            case 0xA000:
                this.i = (opcode & 0x0fff);
                break;
            case 0xB000:
                this.pc = (opcode & 0x0fff) + this.v[0];
                break;
            case 0xC000:
                let rand = Math.floor(Math.random * 0xff);
                this.v[x] = rand & (opcode & 0x00ff);
                break;
            case 0xD000:
                let width = 8;
                let height = (opcode & 0x000f);

                this.v[0xf] = 0;
                for (let row = 0; row < height; row++) {
                    let sprite = this.memory[this.i + row];
                    for (let col = 0; col < width; col++) {
                        // If the bit (sprite) is not 0, render/erase the pixel
                        if((sprite & 0x80) > 0){
                             // If setPixel returns 1, which means a pixel was erased, set VF to 1
                             if(this.renderer.setPixel(this.v[x] + col, this.v[y] + row)){
                                 this.v[0xf] = 1;
                             }
                        }   
                        sprite <<= 1;                    
                    }
                    
                }
                break;
            case 0xE000:
                switch (opcode & 0xFF) {
                    case 0x9E:
                        if(this.keyboard.isKeyPressed(this.v[x])){
                            this.pc += 2;
                        }
                        break;
                    case 0xA1:
                        if(!this.keyboard.isKeyPressed(this.v[x])){
                            this.pc += 2;
                        }
                        break;
                }
        
                break;
            case 0xF000:
                switch (opcode & 0xFF) {
                    case 0x07:
                        this.v[x] = this.delayTimer;
                        break;
                    case 0x0A:
                        this.paused = true;
                        this.keyboard.onNextKeyPress = function(key){
                            this.v[x] = key;
                            this.paused = false;
                        }.bind(this);
                        break;
                    case 0x15:
                        this.delayTimer = this.v[x];
                        break;
                    case 0x18:
                        this.soundTimer = this.v[x];
                        break;
                    case 0x1E:
                        this.i += this.v[x];
                        break;
                    case 0x29:
                        this.i = this.v[x] * 5;
                        break;
                    case 0x33:
                        //hundreds
                        this.memory[this.i] = parseInt(this.v[x] / 100);
                        //tens
                        this.memory[this.i+1] = parseInt((this.v[x] % 100) /10);
                        //ones
                        this.memory[this.i + 2] = parseInt(this.v[x] % 10);
                        break;
                    case 0x55:
                        for (let registerIndex = 0; registerIndex < x; registerIndex++) {
                            this.memory[this.i + registerIndex] = this.v[registerIndex];
                        }
                        break;
                    case 0x65:
                        for (let registerIndex = 0; registerIndex < x; registerIndex++) {
                            this.v[registerIndex] = this.memory[this.i + registerIndex];
                        }
                        break;
                }
        
                break;
        
            default:
                throw new Error('Unknown opcode ' + opcode);
        }
    }
}
export default CPU;
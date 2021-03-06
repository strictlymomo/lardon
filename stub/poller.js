async function init() {
    const NETWORK_GENESIS_TIME = "2020-01-10T00:00:00Z";
    // Prysm API    
    const BASE_URL = "https://api.prylabs.net/eth/v1alpha1";
    const NORMAL_INTERVAL = 12000;
    const SLEEP_INTERVAL = 1000;
    const SLOTS_PER_EPOCH = 32;
    let pollInterval = NORMAL_INTERVAL;

    const CHAINHEAD = {
        URL: "/beacon/chainhead",
        getChainhead: async function () {
            let chainhead = await fetch(`${BASE_URL}${this.URL}`)
                .then(response => response.json())
                .then(data => data);
            return chainhead;
        },
        getHeadSlot: async function () {
            return parseInt((await this.getChainhead()).headSlot);
        },
        getHeadEpoch: async function () {
            return parseInt((await this.getChainhead()).headEpoch);
        },
    }

    const BLOCKS = {
        SLOT_URL: "/beacon/blocks?slot=",
        EPOCH_URL: "/beacon/blocks?epoch=",
        getBlock: async function (param) {
            return await fetch(`${BASE_URL}${this.SLOT_URL}${param}`)
                .then(response => response.json())
                .then(data => (data.blockContainers.length === 1) ? data.blockContainers[0] : null);
        },
        getBlocksByEpoch: async function(param) {
            return await fetch(`${BASE_URL}${this.EPOCH_URL}${param}`)
                .then(response => response.json())
                .then(data => data.blockContainers);
        },
        getBlocksForPreviousEpochs: async function (headEpoch) {
            let blockContainersInPrevEpochs = [];
            const pe1 = headEpoch - 1;
            const pe2 = headEpoch - 2;
            let prevEpochs = [pe2, pe1, headEpoch];
            
            console.log("prevEpochs:                ", prevEpochs);
            console.log("%c                            GETTING BLOCKS FOR PREVIOUS EPOCHS", "color: gray");
            console.log("                           ", "Slot", "    | ", "Parent", " / ", "Root", "   |   ", "Mod", "  |  ", "Status",  "   |   ", "Epoch"); 
            for (const epoch of prevEpochs) {
                
                blockContainersInEpoch = await this.getBlocksByEpoch(epoch);
                
                blockContainersInEpoch.forEach((blockContainer, i) => {
                    let currSlot = blockContainersInEpoch[i].block.block.slot;
                    
                    if (currSlot > 0 && blockContainersInEpoch[i - 1]) {
                        // measure different with previous
                        let prevSlot = blockContainersInEpoch[i - 1].block.block.slot;
                        let difference = currSlot - prevSlot;
                        if (difference > 1) {
                            let counter = parseInt(prevSlot) + 1;
                            do {
                                difference--;
                                console.log(`%c                            ${counter}`, "color: orange");
                                let slot = {
                                    epoch: calculateEpoch(counter),
                                    slot: counter,
                                    status: "missed",
                                    time: calculateTime(counter),
                                }
                                data.push(slot);
                                counter++;
                            } while (difference > 1);
                        };
                    }
                    console.log("                           ", blockContainer.block.block.slot, "   |   ", base64toHEX(blockContainer.block.block.parentRoot).substr(2,4), " / ", base64toHEX(blockContainer.blockRoot).substr(2,4), "   |   ", parseInt((blockContainer.block.block.slot) % SLOTS_PER_EPOCH), "   |   ", calculateStatus(blockContainer.block.block.slot), "   |   ", calculateEpoch(blockContainer.block.block.slot));
                    let slot = {
                        epoch: calculateEpoch(blockContainer.block.block.slot),
                        slot: blockContainer.block.block.slot,
                        status: calculateStatus(blockContainer.block.block.slot),
                        time: calculateTime(blockContainer.block.block.slot),
                    }
                    // console.log(slot);
                    data.push(slot);
                })
            }
            console.log("Initial Data:                ", data);
        },
    }

    let data = [];

    let chainhead = {};
    
    let status = {        
        // scheduled
        scheduledSlot: null,
        scheduledEpoch: null,
        
        headBlockRoot: "",
        headSlot: "",
        headEpoch: "",

        previousBlockRoot: "",
        previousSlot: "",
        currentBlock: {},
        gapBlock: {},

        // justified (Prysm API)
        justifiedSlot: "",
        justifiedEpoch: "",
        justifiedBlockRoot: "",

        // finalized (Prysm API)
        finalizedSlot: "",
        finalizedEpoch: "",
        finalizedBlockRoot: "",
    }

    // Start
    await getInitial();
    await BLOCKS.getBlocksForPreviousEpochs(status.headEpoch);

    // TODO: render chainhead, epoch, block, etc.

    // Poll for updates
    let poller = setInterval(() => poll(), pollInterval);

    async function getInitial() {

        calculateCurrentState();

        console.log("=========================== GETTING INITIAL");

        chainhead = await CHAINHEAD.getChainhead();
        console.log("%cChainhead:                 ", "font-weight: bold", chainhead);

        status.finalizedSlot = parseInt(chainhead.finalizedSlot);
        status.finalizedEpoch = parseInt(chainhead.finalizedEpoch);
        console.log("%cFinalized Slot | Epoch:    ", "font-weight: bold", status.finalizedSlot, "|", status.finalizedEpoch);

        status.justifiedSlot = parseInt(chainhead.justifiedSlot);
        status.justifiedEpoch = parseInt(chainhead.justifiedEpoch);
        console.log("%cJustified Slot | Epoch:    ", "font-weight: bold", status.justifiedSlot, "|", status.justifiedEpoch);

        status.headSlot = parseInt(chainhead.headSlot);
        status.headEpoch = parseInt(chainhead.headEpoch);
        console.log("%cHead Slot | Epoch:         ", "font-weight: bold", status.headSlot, "|", status.headEpoch);

        // TO DO: EXCEPTION: if chainhead is less than currentSlot, do something about it.

        // Get Block
        status.currentBlock = await BLOCKS.getBlock(status.headSlot)

        if (status.currentBlock) {
            console.log("%cBlock Root:                ", "font-weight: bold", base64toHEX(status.currentBlock.blockRoot));
        } else {
            console.log("No block");
        }
    }

    async function getLatest() {

        console.log("===========================");

        // Update previous
        status.previousSlot = status.headSlot;
        status.previousBlockRoot = status.headBlockRoot;

        // Get Current Slot
        status.headSlot = await CHAINHEAD.getHeadSlot();

        console.log("%cPrev Slot:                 ", "font-weight: bold", status.previousSlot);
        console.log("%cHead Slot:                 ", "font-weight: bold", status.headSlot);
        
        // Compare
        let difference = status.headSlot - status.previousSlot;
        console.log("%cDifference:                ", "font-weight: bold", difference);
        
        if (difference === 0) {
            console.log("%c                            CLIENT IS NOT UP TO DATE. SLEEP ANOTHER INTERVAL", "color: orange");
            
            // TODO: SPEED UP THE POLLER TO CHECK FOR NEW SLOT FASTER SO WE DON'T LAG

        } else if (difference > 1) {
            console.log("%c                            GAP - COULD BE MISSING SLOTS... LET'S CHECK.", "color: red");
            
            let prev = status.previousSlot;

            do {
                console.log("GET:                       ", (prev + 1));
                status.gapBlock = await BLOCKS.getBlock(prev + 1);

                if (status.gapBlock) {
                    console.log("block ?                    ", status.gapBlock);
                    console.log("%cBlock Root:                ", "font-weight: bold", base64toHEX(status.gapBlock.blockRoot));
                    // TO DO: push gapBlock to nodes
                } else {
                    console.log("block ?                    ", status.gapBlock);
                    // block is missing
                    // TO DO: missing block object to nodes
                }
                difference--;
                prev++;
            } while (difference > 1);

            console.log("%c                            CAUGHT UP - GETTING NEXT BLOCK...", "color: green");
            
            status.previousBlockRoot = base64toHEX(status.currentBlock.blockRoot);
            console.log("%cPrev  Root:                ", "font-weight: bold", status.previousBlockRoot);
            
            // Get Block
            status.currentBlock = await BLOCKS.getBlock(status.headSlot);
            if (status.currentBlock) {
                console.log("%cBlock Root:                ", "font-weight: bold", base64toHEX(status.currentBlock.blockRoot));
            } else if (status.currentBlock === null) {
                console.log("No block");
            }

        } else if (difference === 1) {
            console.log("%c                            GOOD - GETTING NEXT BLOCK...", "color: green");
            
            status.previousBlockRoot = base64toHEX(status.currentBlock.blockRoot);
            console.log("%cPrev  Root:                ", "font-weight: bold", status.previousBlockRoot);
            
            // Get Block
            status.currentBlock = await BLOCKS.getBlock(status.headSlot);
            if (status.currentBlock) {
                console.log("%cBlock Root:                ", "font-weight: bold", base64toHEX(status.currentBlock.blockRoot));
                // TO DO: push block to nodes
            } else if (status.currentBlock === null) {
                console.log("No block");
                // TO DO: push missing to nodes
            }
        } 
    }

    async function poll() {
        await getLatest();
        // TODO: render chainhead, epoch, block, etc.
    }

    function base64toHEX(base64) {
        let raw = atob(base64);
        let hex = "0x";
        for (i = 0; i < raw.length; i++) {
            let _hex = raw.charCodeAt(i).toString(16)
            hex += (_hex.length == 2 ? _hex : "0" + _hex);
        }
        return hex;
    }

    function calculateCurrentState() {
        let now = Math.floor((new Date()).getTime() / 1000);
        let genesis = Math.floor(new Date(NETWORK_GENESIS_TIME).getTime() / 1000);
    
        status.scheduledSlot = Math.floor((now - genesis) / 12);
        status.scheduledEpoch = Math.floor(status.scheduledSlot / 32);
        console.log("%cScheduled Slot | Epoch:    ", "font-weight: bold", status.scheduledSlot, "|", status.scheduledEpoch);
    }
    
    function calculateTime(slot) {
        return timestamp = new Date(new Date(NETWORK_GENESIS_TIME).getTime() + (slot * 1000 * 12))
    }

    function calculateEpoch(slot) {
        return epoch = Math.floor(slot / 32)
    }

    function calculateStatus(s) {
        let slot = parseInt(s);
        let slotStatus;
        if (slot <= status.finalizedSlot) {
            slotStatus = "finalized";
        }    
        else if (slot > status.finalizedSlot && slot <= status.justifiedSlot) {
            slotStatus = "justified";
        }
        else {
            slotStatus = "proposed";
        }    
        return slotStatus;
    }

    function formatTime(t) {
        if (t < 0) t = 0;
        if (t > 12) t = 12;
    
        t += "";
    
        if (t.indexOf(".") === -1) t += ".0";
    
        t += "s";
    
        return t
    }
    
    // test functions
    function consecutive(a,b) {
        let arr = [];
        for (b; b >= a; b--) {
            arr.push(b);
        }
        return arr.reverse();
    }
}

init();
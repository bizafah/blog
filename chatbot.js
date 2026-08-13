/**
 * VELIRRA Advanced AI Chatbot
 * Powered by a custom NLP Classifier and Recommendation Engine.
 */

(function () {
    // --- 1. PRODUCT DATABASE ---
    const PRODUCTS = [
        { id: 'legacy', name: 'Legacy', inspiration: 'Azzaro The Most Wanted', price: 2399, gender: 'Men', notes: 'Cardamom, Ginger, Lemon', personality: ['Bold', 'Confident', 'Night'], vibe: 'Warm & Spicy' },
        { id: 'classic', name: 'Classic', inspiration: 'Dolce & Gabbana Pour Homme', price: 1699, gender: 'Men', notes: 'Citrus, Herbs, Tobacco', personality: ['Elegant', 'Traditional', 'Mature'], vibe: 'Herbal & Woody' },
        { id: '7one', name: '7ONE', inspiration: 'Invictus Legend', price: 1699, gender: 'Unisex', notes: 'Sea Salt, Grapefruit, Amber Wood', personality: ['Energetic', 'Sporty', 'Active'], vibe: 'Fresh & Aquatic' },
        { id: 'bloom', name: 'Bloom', inspiration: 'VS Bombshell', price: 1499, gender: 'Women', notes: 'Passionfruit, Peony, Musk', personality: ['Sweet', 'Romantic', 'Youthful'], vibe: 'Floral & Fruity' },
        { id: 'legendary', name: 'Legendary', inspiration: '1 Million Lucky', price: 1999, gender: 'Unisex', notes: 'Plum, Hazelnut, Amber', personality: ['Charismatic', 'Playful', 'Sweet'], vibe: 'Gourmand' },
        { id: 'intense', name: 'Intense', inspiration: 'Tom Ford Tuscan Leather', price: 2099, gender: 'Unisex', notes: 'Raspberry, Leather, Amber', personality: ['Rebellious', 'Sophisticated', 'Bold'], vibe: 'Leather & Suede' },
        { id: 'prime', name: 'Prime', inspiration: 'Bleu de Chanel', price: 1899, gender: 'Men', notes: 'Citrus, Spices, Siky Notes', personality: ['Modern', 'Versatile', 'Professional'], vibe: 'Woody & Aromatic' },
        { id: 'blue', name: 'Blue', inspiration: 'Light Blue D&G', price: 1899, gender: 'Women', notes: 'Mandarin, Grapefruit, Juniper', personality: ['Chic', 'Summer', 'Romantic'], vibe: 'Citrus & Floral' },
        { id: 'homme', name: 'Homme', inspiration: 'Dior Homme Intense', price: 1899, gender: 'Men', notes: 'Lavender, Iris, Cedar', personality: ['Luxurious', 'Formal', 'Mysterious'], vibe: 'Powdery & Elegant' },
        { id: 'auraoud', name: 'Aura Oud', inspiration: 'Ameer Al Oud', price: 2160, gender: 'Unisex', notes: 'Wood Notes, Agarwood, Vanilla, Sugar, Sandalwood, Herbal Notes', personality: ['Luxurious', 'Formal', 'Mysterious', 'Sweet', 'Bold'], vibe: 'Amber & Woody' }
    ];

    // --- 2. NLP CLASSIFIER (Naive Bayes Simulation) ---
    class VelirraClassifier {
        constructor() {
            this.intents = {
                'greeting': ['hi', 'hello', 'hey', 'salam', 'morning', 'evening', 'good day', 'who are you', 'how are you'],
                'price_low': ['cheap', 'budget', 'affordable', 'low cost', 'under', 'below', 'less than', 'cheapest', 'pocket friendly'],
                'price_high': ['premium', 'luxury', 'expensive', 'high end', 'best quality', 'top tier', 'gold', 'expensive'],
                'shipping': ['shipping', 'delivery', 'arrive', 'wait', 'track', 'courier', 'days', 'ship', 'charges', 'fee', 'delivery fee'],
                'location': ['location', 'where', 'shop', 'store', 'lahore', 'address', 'visit', 'office'],
                'personality': ['personality', 'character', 'person', 'vibe', 'gift', 'husband', 'wife', 'girlfriend', 'boyfriend', 'matching', 'fit'],
                'occurrence': ['office', 'work', 'date', 'party', 'wedding', 'event', 'daily', 'gym', 'summer', 'winter', 'night', 'morning', 'day'],
                'recommendation': ['recommend', 'best', 'top', 'suggest', 'pick', 'choice', 'buy', 'popular', 'bestseller'],
                'gender_men': ['men', 'man', 'gents', 'male', 'boy', 'him'],
                'gender_women': ['women', 'woman', 'ladies', 'female', 'girl', 'her'],
                'longevity': ['long last', 'longevity', 'duration', 'hours', 'stays', 'fade', 'strong'],
                'return': ['return', 'exchange', 'policy', 'refund', 'change'],
                'contact': ['contact', 'whatsapp', 'number', 'phone', 'email', 'talk', 'human', 'call'],
                'order': ['how to order', 'order', 'buy', 'purchase', 'how to buy', 'process']
            };
        }

        classify(text) {
            const input = text.toLowerCase();
            const scores = {};

            for (const intent in this.intents) {
                scores[intent] = 0;
                this.intents[intent].forEach(keyword => {
                    if (input.includes(keyword)) scores[intent]++;
                });
            }

            // Return highest scoring intent
            const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
            return sorted[0][1] > 0 ? sorted[0][0] : 'unknown';
        }
    }

    const classifier = new VelirraClassifier();

    // --- 3. REASONING ENGINE ---
    function getDetailedResponse(input) {
        const text = input.toLowerCase();

        // --- Dynamic Price Filtering ---
        const priceMatch = text.match(/(?:under|below|less than|budget of|max|around|up to)\s*(?:rs\.?|pkr|₨)?\s*(\d+)/i) || text.match(/(?:price|cost|budget)\s*(?:is|of)?\s*(?:rs\.?|pkr|₨)?\s*(\d+)/i);
        const maxPrice = priceMatch ? parseInt(priceMatch[1]) : null;

        if (maxPrice) {
            const affordable = PRODUCTS.filter(p => p.price <= maxPrice);
            if (affordable.length > 0) {
                let resp = `I found **${affordable.length}** perfumes under ₨ ${maxPrice}:\n\n`;
                affordable.slice(0, 4).forEach(p => {
                    resp += `• **${p.name}** (₨ ${p.price}): ${p.vibe}\n`;
                });
                if (affordable.length > 4) resp += "...and more!";
                resp += "\nWhich one sounds interesting to you?";
                return resp;
            } else {
                return `I'm sorry, we don't have any perfumes currently under ₨ ${maxPrice}. Our most affordable options are **BLOOM** and **OCEAN** starting at ₨ 1,970.`;
            }
        }

        const intent = classifier.classify(input);

        switch (intent) {
            case 'greeting':
                return "Salam! I'm the Velirra AI. I can help you find a perfume based on your price range, gender, or even your personality! What are you looking for today?";

            case 'price_low':
                return "Our most affordable options are **BLOOM** (₨ 1,970) and **OCEAN** (₨ 1,970). Most of our core collection is priced around ₨ 2,400 to ₨ 2,700.";

            case 'price_high':
                return "Our premium selection includes **BLUE** (₨ 2,900), **HOMME** (₨ 2,900), and **AURA OUD** (₨ 2,980). These use our highest quality imported oils.";

            case 'shipping':
                return "We ship nationwide! The delivery charges are only **₨ 200** for all orders across Pakistan.";

            case 'location':
                return "We are based in **Lahore**! While we are primarily an online store, we ensure safe and fast delivery to your doorstep anywhere in Pakistan.";

            case 'personality':
            case 'occurrence':
                return handlePersonalityMatch(text);

            case 'recommendation':
                return "I recommend starting with our bestsellers: **LEGACY** (Bold Night Scent) or **PRIME** (Fresh Office Scent). If you tell me your budget or your favorite scent notes (like citrus or woody), I can be more specific!";

            case 'gender_men':
                return "For men, our bestsellers are **LEGACY** (Bold & Spicy) and **PRIME** (Modern & Versatile). Would you like something for the office or a night out?";

            case 'gender_women':
                return "For ladies, **BLOOM** is incredibly popular for its floral sweetness, and **BLUE** is perfect for an elegant, chic vibe.";

            case 'longevity':
                return "All our perfumes are EDP concentration. For extreme longevity (+8 hours), I highly recommend **HOMME**, **AURA OUD**, and **INTENSE**.";

            case 'return':
                return "We have a 7-day hassle-free return policy if the product is unused. We want you to be 100% happy with your scent!";

            case 'contact':
                return "You can chat with our team on WhatsApp at **03710738971** or email us at sales@velirra.store.";

            case 'order':
                return "Ordering is easy! Just follow these steps:\n\n1️⃣ **Select your category** (Male, Female, or Unisex).\n2️⃣ **Choose your perfume** and click on it.\n3️⃣ Click **Add to Cart**.\n4️⃣ Press **Checkout**.\n5️⃣ Fill in your **delivery details** and you've ordered successfully!\n\nNeed help? Just ask!";

            default:
                // Specific matching for product names
                const foundProduct = PRODUCTS.find(p => text.includes(p.name.toLowerCase()));
                if (foundProduct) {
                    return `**${foundProduct.name}** is inspired by ${foundProduct.inspiration}. It features notes of ${foundProduct.notes} and is priced at ₨ ${foundProduct.price}. It's perfect for someone with a ${foundProduct.personality[0]} personality!`;
                }

                return "I'm not sure about that, but I can definitely help you find a perfume! Try asking about 'Gents perfumes', 'Best for summer', or 'Perfumes under 2500'.";
        }
    }

    function handlePersonalityMatch(text) {
        if (text.includes('office') || text.includes('work') || text.includes('professional')) {
            return "For a professional office environment, **PRIME** is perfect. It is clean, confident, and not overpowering.";
        }
        if (text.includes('party') || text.includes('night') || text.includes('bold')) {
            return "Going to a party? You need **LEGACY** or **INTENSE**. These are bold, addictive, and will definitely get you noticed!";
        }
        if (text.includes('date') || text.includes('romantic') || text.includes('love')) {
            return "For a romantic date, **BLUE** (for women) or **HOMME** (for men) create a mysterious and alluring aura.";
        }
        if (text.includes('gift')) {
            return "As a gift, **7ONE** and **LEGENDARY** are safe bets because they are Unisex and loved by almost everyone!";
        }
        if (text.includes('summer') || text.includes('hot') || text.includes('fresh')) {
            return "For hot weather, stay fresh with **OCEAN** or **7ONE**. They have amazing aquatic and citrus notes.";
        }

        return "Tell me a bit more! Is this for a specific event (like a wedding or work) or a gift for someone special?";
    }

    // --- 4. UI ANIMATION & HANDLING ---
    const styles = `
        #velirra-chatbot-container {
            position: fixed;
            bottom: 110px;
            right: 40px;
            z-index: 2000;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        #chatbot-launcher {
            width: 60px; height: 60px;
            background-color: #000; color: #c5a059;
            border-radius: 50%; display: flex;
            justify-content: center; align-items: center;
            font-size: 1.5rem; cursor: pointer;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #chatbot-launcher:hover { transform: scale(1.1) rotate(5deg); }
        #chatbot-window {
            width: 380px; 
            max-height: calc(100vh - 200px);
            height: 600px;
            background: #fff; border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            margin-bottom: 20px; display: none;
            flex-direction: column; overflow: hidden;
            animation: chatAppear 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
            border: 1px solid rgba(0,0,0,0.05);
        }
        @keyframes chatAppear {
            from { transform: translateY(30px) scale(0.9); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
        }
        #chatbot-header {
            background: #000; color: #fff;
            padding: 25px; display: flex;
            justify-content: space-between; align-items: center;
        }
        #chatbot-header h3 { margin: 0; font-size: 0.9rem; letter-spacing: 2px; color: #c5a059; text-transform: uppercase; }
        #chatbot-messages {
            flex: 1; padding: 20px;
            overflow-y: auto; display: flex;
            flex-direction: column; gap: 12px;
            background: #fdfdfd; scroll-behavior: smooth;
        }
        .message {
            max-width: 85%; padding: 12px 16px;
            border-radius: 18px; font-size: 0.92rem;
            line-height: 1.5; position: relative;
        }
        .bot-message {
            align-self: flex-start; background: #f1f1f1;
            color: #222; border-bottom-left-radius: 4px;
        }
        .user-message {
            align-self: flex-end; background: #000;
            color: #fff; border-bottom-right-radius: 4px;
            background: linear-gradient(135deg, #222, #000);
        }
        #chatbot-input-area {
            padding: 20px; border-top: 1px solid #f0f0f0;
            display: flex; flex-direction: column; gap: 10px; background: #fff;
        }
        .input-row { display: flex; gap: 10px; }
        #chatbot-input {
            flex: 1; border: 1px solid #eee;
            padding: 12px 20px; border-radius: 30px;
            outline: none; font-family: inherit; font-size: 0.9rem;
            transition: border-color 0.3s;
        }
        #chatbot-input:focus { border-color: #c5a059; }
        #chatbot-send {
            width: 45px; height: 45px; border-radius: 50%;
            background: #000; border: none; color: #c5a059;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s;
        }
        #chatbot-send:hover { transform: scale(1.05); }
        .typing-indicator { font-size: 0.75rem; color: #aaa; margin-left: 5px; display: none; }
        
        /* Message Markdown-ish styles */
        .message b, .message strong { color: #c5a059; }
        
        @media (max-width: 480px) {
            #chatbot-window { 
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw; 
                height: 100vh; 
                margin: 0;
                border-radius: 0; 
                z-index: 3000;
            }
            #chatbot-header { padding: 30px 20px; }
            #velirra-chatbot-container { bottom: 90px; right: 20px; }
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const container = document.createElement("div");
    container.id = "velirra-chatbot-container";
    container.innerHTML = `
        <div id="chatbot-window">
            <div id="chatbot-header">
                <div>
                    <h3>VELIRRA AI</h3>
                </div>
                <span id="close-chatbot" style="cursor:pointer; font-size: 1.2rem;"><i class="fa-solid fa-xmark"></i></span>
            </div>
            <div id="chatbot-messages"></div>
            <div id="chatbot-input-area">
                <div class="typing-indicator" id="typing-indicator">Assistant is typing...</div>
                <div class="input-row">
                    <input type="text" id="chatbot-input" placeholder="Ask about perfumes, prices, or vibes...">
                    <button id="chatbot-send"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
        <div id="chatbot-launcher">
            <i class="fa-solid fa-robot"></i>
        </div>
    `;
    document.body.appendChild(container);

    const launcher = document.getElementById("chatbot-launcher");
    const windowEl = document.getElementById("chatbot-window");
    const closeBtn = document.getElementById("close-chatbot");
    const sendBtn = document.getElementById("chatbot-send");
    const inputEl = document.getElementById("chatbot-input");
    const messagesEl = document.getElementById("chatbot-messages");
    const typingIndicator = document.getElementById("typing-indicator");

    let isFirst = true;

    launcher.addEventListener("click", () => {
        const show = windowEl.style.display !== "flex";
        windowEl.style.display = show ? "flex" : "none";
        if (show && isFirst) {
            isFirst = false;
            setTimeout(() => addMessage("Welcome to Velirra! I am your AI scent expert. Ask me anything—I can even recommend a perfume based on your personality or budget!", "bot"), 600);
        }
    });

    closeBtn.addEventListener("click", () => windowEl.style.display = "none");
    sendBtn.addEventListener("click", handleSend);
    inputEl.addEventListener("keypress", (e) => e.key === "Enter" && handleSend());

    function handleSend() {
        const val = inputEl.value.trim();
        if (!val) return;
        addMessage(val, "user");
        inputEl.value = "";

        typingIndicator.style.display = "block";
        messagesEl.scrollTop = messagesEl.scrollHeight;

        setTimeout(() => {
            const resp = getDetailedResponse(val);
            addMessage(resp, "bot");
            typingIndicator.style.display = "none";
        }, 800);
    }

    function addMessage(html, sender) {
        const div = document.createElement("div");
        div.className = `message ${sender}-message`;
        // Handle simple bold/italic simulation
        div.innerHTML = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
})();

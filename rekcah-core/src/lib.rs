use rand::seq::SliceRandom;
use rand::thread_rng;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Suit { Hearts, Diamonds, Clubs, Spades, Joker }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Rank { 
    Ace = 1, Two, Three, Four, Five, Six, Seven, Eight, Nine, Ten, 
    Jack, Queen, King, Joker = 99 
}

#[derive(Debug, Clone)]
pub struct Card {
    pub id: String,
    pub rank: Rank,
    pub suit: Suit,
}

impl Card {
    pub fn value(&self) -> i32 {
        match self.rank {
            Rank::Joker => -1,
            Rank::Ten | Rank::Jack | Rank::Queen | Rank::King => 10,
            _ => self.rank as i32,
        }
    }
}

pub struct Player {
    pub id: String,
    pub hand: Vec<Card>,
    pub score: i32,
    pub eliminated: bool,
}

pub struct RekcahMatch {
    pub players: Vec<Player>,
    pub current_player_index: usize,
    pub draw_pile: Vec<Card>,
    pub discard_pile: Vec<Card>,
    pub phase: String,
}

impl RekcahMatch {
    pub fn new(player_count: usize) -> Self {
        let mut players = Vec::new();
        for i in 0..player_count {
            players.push(Player {
                id: format!("p{}", i),
                hand: Vec::new(),
                score: 0,
                eliminated: false,
            });
        }
        
        let mut match_obj = RekcahMatch {
            players,
            current_player_index: 0,
            draw_pile: Vec::new(),
            discard_pile: Vec::new(),
            phase: "Action".to_string(),
        };
        match_obj.start_round();
        match_obj
    }

    pub fn start_round(&mut self) {
        let mut deck = Vec::new();
        // Simplified deck creation for build test
        for i in 0..54 {
            deck.push(Card {
                id: format!("c{}", i),
                rank: Rank::Ace,
                suit: Suit::Spades,
            });
        }

        let mut rng = thread_rng();
        deck.shuffle(&mut rng);
        
        for player in &mut self.players {
            if !player.eliminated {
                player.hand = deck.drain(0..6).collect();
            }
        }
        self.discard_pile = vec![deck.pop().unwrap()];
        self.draw_pile = deck;
        self.phase = "Action".to_string();
    }

    pub fn can_show(&self) -> bool {
        let player = &self.players[self.current_player_index];
        self.phase == "Action" && player.hand.iter().map(|c| c.value()).sum::<i32>() <= 15
    }

    pub fn discard(&mut self, card_ids: Vec<String>) -> Result<(), String> {
        if self.phase != "Action" { return Err("Not in Action phase".into()); }
        
        let player = &mut self.players[self.current_player_index];
        for id in card_ids {
            if let Some(pos) = player.hand.iter().position(|c| c.id == id) {
                let card = player.hand.remove(pos);
                self.discard_pile.push(card);
            }
        }
        
        self.phase = "Draw".to_string();
        Ok(())
    }

    pub fn draw_from_stock(&mut self) -> Result<(), String> {
        if self.phase != "Draw" { return Err("Not in Draw phase".into()); }
        
        if let Some(card) = self.draw_pile.pop() {
            let player = &mut self.players[self.current_player_index];
            player.hand.push(card);
        }
        
        self.advance_turn();
        Ok(())
    }

    pub fn show(&mut self) -> Result<(), String> {
        if !self.can_show() { return Err("Invalid show".into()); }
        self.start_round();
        Ok(())
    }

    fn advance_turn(&mut self) {
        self.current_player_index = (self.current_player_index + 1) % self.players.len();
        self.phase = "Action".to_string();
    }
}

// FFI Exports for Unreal and C#
#[unsafe(no_mangle)]
pub extern "C" fn create_match(player_count: usize) -> *mut RekcahMatch {
    Box::into_raw(Box::new(RekcahMatch::new(player_count)))
}

#[unsafe(no_mangle)]
pub extern "C" fn rust_can_show(ptr: *const RekcahMatch) -> bool {
    let match_obj = unsafe { &*ptr };
    match_obj.can_show()
}

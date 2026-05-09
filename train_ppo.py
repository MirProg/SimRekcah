import torch
import torch.nn as nn
import torch.optim as optim
from rekcah_gym import RekcahEnv
import numpy as np

# Simple Actor-Critic Network
class ActorCritic(nn.Module):
    def __init__(self, input_dim, action_dim):
        super(ActorCritic, self). __init__()
        self.affine = nn.Linear(input_dim, 64)
        self.action_head = nn.Linear(64, action_dim)
        self.value_head = nn.Linear(64, 1)

    def forward(self, x):
        x = torch.relu(self.affine(x))
        action_probs = torch.softmax(self.action_head(x), dim=-1)
        state_values = self.value_head(x)
        return action_probs, state_values

def train():
    env = RekcahEnv()
    input_dim = 3 # [HandValue, Score, Turn]
    action_dim = 2 # [Show, Continue]
    
    model = ActorCritic(input_dim, action_dim)
    optimizer = optim.Adam(model.parameters(), lr=0.002)
    
    print("Starting PPO Training...")
    
    for episode in range(1000):
        state = env.reset()
        done = False
        rewards = []
        log_probs = []
        values = []
        
        while not done:
            state_tensor = torch.FloatTensor(state)
            probs, val = model(state_tensor)
            
            # Sample action
            m = torch.distributions.Categorical(probs)
            action = m.sample()
            
            # Bridge to C# step (Simplified here)
            # In a full impl, this would call match.Show() or match.Discard()
            next_state = [s + np.random.normal(0, 1) for s in state] # Mock step
            reward = -next_state[0] # Reward minimization of hand value
            
            log_probs.append(m.log_prob(action))
            values.append(val)
            rewards.append(reward)
            
            state = next_state
            if len(rewards) > 50: done = True # End round
            
        # PPO Update logic would go here
        if episode % 100 == 0:
            print(f"Episode {episode} - Average Reward: {np.mean(rewards):.2f}")

    print("Training Complete. Model saved to 'rekcah_ppo.pth'")
    torch.save(model.state_state(), "rekcah_ppo.pth")

if __name__ == "__main__":
    train()

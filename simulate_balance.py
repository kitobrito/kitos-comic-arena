
class Unit:
    def __init__(self, name, hp, dr_flat=0, destructible_defense=0):
        self.name = name
        self.hp = hp
        self.dr_flat = dr_flat
        self.destructible_defense = destructible_defense

    def take_damage(self, amount):
        # Apply destructible defense first
        if self.destructible_defense > 0:
            absorbed = min(self.destructible_defense, amount)
            self.destructible_defense -= absorbed
            amount -= absorbed
        
        # Apply DR
        amount = max(0, amount - self.dr_flat)
        
        # Apply to HP
        self.hp -= amount
        return amount

def simulate_duel(tank, attacker_damage):
    turns = 0
    while tank.hp > 0:
        tank.take_damage(attacker_damage)
        turns += 1
    return turns

# Scenario: Tank (Captain America) vs Standard High-Damage Attacker
# Cap: 100 HP + 20 Destructible Defense (our "Effective HP" model)
# Attacker: 25 damage per hit (standard high output)
cap = Unit("Captain America", hp=100, dr_flat=5, destructible_defense=20)
attacker_dmg = 25

turns = simulate_duel(cap, attacker_dmg)
print(f"Turns for attacker to kill Cap: {turns}")

squishy = Unit("Utility Unit", hp=100, dr_flat=0, destructible_defense=0)
turns_squishy = simulate_duel(squishy, attacker_dmg)
print(f"Turns for attacker to kill Utility Unit: {turns_squishy}")

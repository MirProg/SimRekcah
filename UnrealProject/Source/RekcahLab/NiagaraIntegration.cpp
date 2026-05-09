#include "RekcahCard.h"
#include "NiagaraComponent.h"
#include "NiagaraFunctionLibrary.h"

// In ARekcahCard.h, add:
// UPROPERTY(EditAnywhere, Category = "Rekcah|FX")
// UNiagaraSystem* RevealEffect;

void ARekcahCard::TriggerRevealEffect()
{
    if (RevealEffect)
    {
        UNiagaraComponent* NiagaraComp = UNiagaraFunctionLibrary::SpawnSystemAttached(
            RevealEffect, 
            CardMesh, 
            NAME_None, 
            FVector(0.0f), 
            FRotator(0.0f), 
            EAttachLocation::Type::KeepRelativeOffset, 
            true
        );

        if (NiagaraComp)
        {
            // Pass card-specific parameters to the particles
            NiagaraComp->SetNiagaraVariableLinearColor("GlowColor", GetSuitColor());
            NiagaraComp->SetNiagaraVariableFloat("CardValue", (float)RankValue);
        }
    }
}

FLinearColor ARekcahCard::GetSuitColor()
{
    if (SuitName == "Hearts" || SuitName == "Diamonds") return FLinearColor::Red;
    if (SuitName == "Spades" || SuitName == "Clubs") return FLinearColor::Blue;
    return FLinearColor::White;
}

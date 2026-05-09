#include "RekcahCard.h"

ARekcahCard::ARekcahCard()
{
	PrimaryActorTick.bCanEverTick = true;

    CardMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("CardMesh"));
    RootComponent = CardMesh;
}

void ARekcahCard::BeginPlay()
{
	Super::BeginPlay();
}

void ARekcahCard::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
}

void ARekcahCard::SetCardData(FString InId, int32 InRank, FString InSuit)
{
    CardId = InId;
    RankValue = InRank;
    SuitName = InSuit;

    // Logic to update Dynamic Material Instance parameters would go here
    // e.g. CardMesh->CreateDynamicMaterialInstance(0)->SetScalarParameterValue("Rank", RankValue);
}

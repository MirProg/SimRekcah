#include "RekcahActor.h"
#include "RekcahEngine.h"

ARekcahActor::ARekcahActor()
{
	PrimaryActorTick.bCanEverTick = true;
}

void ARekcahActor::BeginPlay()
{
	Super::BeginPlay();

    // Initialize the native C++ engine
    std::vector<std::string> Agents = { "human", "aggressive", "balanced" };
    GameEngine = new Rekcah::Engine(Agents);
	
    UE_LOG(LogTemp, Warning, TEXT("Rekcah Unreal Engine Initialized."));
}

void ARekcahActor::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

    // Update visuals based on Engine state
    // For example, lerp card positions or update UI widgets
}

void ARekcahActor::OnUserShow()
{
    if (GameEngine && GameEngine->CanShow("p0"))
    {
        GameEngine->Show("p0");
        UE_LOG(LogTemp, Display, TEXT("User Called Show!"));
    }
}

void ARekcahActor::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    delete GameEngine;
    Super::EndPlay(EndPlayReason);
}

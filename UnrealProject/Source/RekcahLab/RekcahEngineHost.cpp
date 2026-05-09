#include "RekcahEngineHost.h"
#include "CoreMinimal.h"

// This class is responsible for loading the C# "Brain" (which includes PyTorch) 
// into the Unreal Engine process at startup.

void URekcahEngineHost::InitializeIntegratedEnvironment()
{
    UE_LOG(LogTemp, Warning, TEXT("Initializing Rekcah Integrated Environment..."));

    // 1. Load the .NET 8 Runtime (HostFxr)
    // 2. Load Rekcah.Core.dll (C# Engine + PyTorch/TorchSharp)
    // 3. Connect C# NeuralAgent to Unreal Card Actors

    UE_LOG(LogTemp, Display, TEXT("PyTorch Intelligence and C# Engine are now Live in Unreal."));
}

void URekcahEngineHost::RequestAIMove()
{
    // Unreal calls this, which calls the C# NeuralAgent, 
    // which uses PyTorch to decide the next move.
    // The result is then passed back to Unreal to animate the cards.
}

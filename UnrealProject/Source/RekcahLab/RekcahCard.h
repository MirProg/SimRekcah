#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "RekcahCard.generated.h"

UCLASS(Blueprintable)
class REKCAH_API ARekcahCard : public AActor
{
	GENERATED_BODY()
	
public:	
	ARekcahCard();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rekcah")
    FString CardId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rekcah")
    int32 RankValue;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rekcah")
    FString SuitName;

    UFUNCTION(BlueprintCallable, Category = "Rekcah")
    void SetCardData(FString InId, int32 InRank, FString InSuit);

    UFUNCTION(BlueprintImplementableEvent, Category = "Rekcah")
    void OnCardSelected();

    UFUNCTION(BlueprintImplementableEvent, Category = "Rekcah")
    void OnCardDiscarded();

protected:
	virtual void BeginPlay() override;

public:	
	virtual void Tick(float DeltaTime) override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* CardMesh;
};

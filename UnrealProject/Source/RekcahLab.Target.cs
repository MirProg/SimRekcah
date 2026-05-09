using UnrealBuildTool;
using System.Collections.Generic;

public class RekcahLabTarget : TargetRules
{
	public RekcahLabTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V4;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_3;
		ExtraModuleNames.Add("RekcahLab");
	}
}
<!-- slide -->
using UnrealBuildTool;
using System.Collections.Generic;

public class RekcahLabEditorTarget : TargetRules
{
	public RekcahLabEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V4;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_3;
		ExtraModuleNames.Add("RekcahLab");
	}
}

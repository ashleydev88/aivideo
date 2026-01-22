import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind-v4';

Config.overrideWebpackConfig((currentConfiguration) => {
    return enableTailwind(currentConfiguration);
});

// Lambda Configuration to maximize processing power
Config.Lambda.setTimeoutInSeconds(900);
Config.Lambda.setMemorySize(3008);
Config.Lambda.setDiskSizeInMb(10240);

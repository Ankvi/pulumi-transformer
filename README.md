# Pulumi Transformer

This project seeks to address a challenge that comes with using the
[Pulumi Azure Native](https://www.pulumi.com/registry/packages/azure-native/)
package; the size. Azure comes with multiple different version for its resources,
which requires Pulumi to support multiple versions of its submodules at all times.
Naturally, the size of the package will grow to an incredible size as the
different Azure modules bump their respective versions.

To combat this issue, Pulumi has reduced size by reducing the amount of supported
old versions as well as reducing the amount of preview versions they support, but
it will only do so much in the long run.

The sheer size of the package results in TypeScript builds failing due to
heap size restrictions unless the device has ~32GB RAM as an example. This can be
"fixed" by setting the `--max-old-space-size=<SIZE>` parameter in your `NODE_OPTIONS`,
but it doesn't change the fact that most TSServer instances will crash,
either once in a while, or all the time.

## The solution; splitting it up

Using the thought process that you shouldn't install a package for something you
don't need, this project will split up the `@pulumi/azure-native` package into
smaller submodules for each Azure resource. This results in over 200 npm packages
that are _much_ smaller than the original, allowing developers to only get intellisense
for only the resources they're going to use.

Thankfully, the original package has folders for each submodule, but the main challenge
is the `types` folder. Not only does it directly reference itself by importing itself
in the [input](https://github.com/pulumi/pulumi-azure-native/blob/master/sdk/nodejs/types/input.ts)
and [output](https://github.com/pulumi/pulumi-azure-native/blob/master/sdk/nodejs/types/output.ts)
files, but these files are **400.000** and **560.000** lines respectively.

From `types/input.ts`:

```typescript
import * as inputs from "../types/input.ts";
import * as outputs from "../types/output.ts";
```

Additionally, the types in these two files are using these import statements to reference
each other. For example, a namespace for `aad` will look like this:

```typescript
export namespace aad {
    /**
     * Configuration Diagnostics
     */
    export interface ConfigDiagnosticsArgs {
        /**
         * Last domain configuration diagnostics DateTime
         */
        lastExecuted?: pulumi.Input<string>;
        /**
         * List of Configuration Diagnostics validator results.
         */
        validatorResults?: pulumi.Input<pulumi.Input<inputs.aad.ConfigDiagnosticsValidatorResultArgs>[]>;
    }

    /**
     * Config Diagnostics validator result data
     */
    export interface ConfigDiagnosticsValidatorResultArgs {
        /**
         * List of resource config validation issues.
         */
        issues?: pulumi.Input<pulumi.Input<inputs.aad.ConfigDiagnosticsValidatorResultIssueArgs>[]>;
        /**
         * Replica set location and subnet name
         */
        replicaSetSubnetDisplayName?: pulumi.Input<string>;
        /**
         * Status for individual validator after running diagnostics.
         */
        status?: pulumi.Input<string | enums.aad.Status>;
        /**
         * Validator identifier
         */
        validatorId?: pulumi.Input<string>;
    }
}
```

Here, we can see that where the `ConfigDiagnosticsArgs` is referencing
`ConfigDiagnosticsValidatorResultArgs`, it does so through the `inputs` import statement,
even though that interface is accessible directly. This is no doubt the result of
the generative nature of the package, meaning that the source code is generated completely
though other means, which makes sense when you're creating SDKs for multiple languages
that you need to update on a weekly basis.

This project seeks to split these type files into refined submodules and place
them inside the other folders that already exist for each submodule. Each submodule
will then have an additional `types` folder that will only contain its own types
and enums.

```txt
packages/
    aad/
        v20221201/
            index.ts
        package.json
        index.ts
        types/
            index.ts
            input.ts
            output.ts
            enums/
                index.ts
                v20221201/
                    index.ts
```

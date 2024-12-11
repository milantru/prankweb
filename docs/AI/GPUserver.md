# Kickstarter to HPC resources for bioinfo

The primary information site for MFF HPC cluster is [https://www.mff.cuni.cz/en/hpc-cluster/general-information](https://www.mff.cuni.cz/en/hpc-cluster/general-information). We have dedicated GPU resources within the `gpulab`.

More detailed information about the cluster is available at the [faculty GitLab](https://gitlab.mff.cuni.cz/mff/hpc/clusters). Apart from the SLURm documentation, the page also lists the available resources - two nodes, `ampere1` and `ampere2`, are available via the `gpu-bio` (and also the `gpu-short`) partition, which is available only via the `ksibio` account. 

To start computing on the HPC cluster, follow the [general information instructions](https://www.mff.cuni.cz/en/hpc-cluster/general-information). To get associated with the `ksibio` account, email [Jakub Yaghob](jakub.yaghob@matfyz.cuni.cz) and David Hoksza in CC.

To run computations with the `ksibio` account, add `-A ksibio` to the SLURM tasks.

## Quickstarter

### Connecting to gpulab

```
ssh -p 42222 hoksd0am@gpulab.ms.mff.cuni.cz
```

### Cluster status

```
sinfo
```
```
PARTITION       AVAIL  TIMELIMIT  NODES  STATE NODELIST
ffa*               up   12:00:00      5    mix ampere01,hopper01,volta[01,04-05]
ffa*               up   12:00:00      4   idle ampere[02-03],volta[02-03]
gpu-ffa            up   12:00:00      5    mix ampere01,hopper01,volta[01,04-05]
gpu-ffa            up   12:00:00      4   idle ampere[02-03],volta[02-03]
gpu-long           up 7-00:00:00      5    mix ampere01,hopper01,volta[01,04-05]
gpu-long           up 7-00:00:00      4   idle ampere[02-03],volta[02-03]
gpu-short          up    2:00:00      5    mix ampere01,hopper01,volta[01,04-05]
gpu-short          up    2:00:00      4   idle ampere[02-03],volta[02-03]
gpu-long-ksi       up 7-00:00:00      5    mix ampere01,hopper01,volta[01,04-05]
gpu-long-ksi       up 7-00:00:00      4   idle ampere[02-03],volta[02-03]
gpu-short-ksi      up    2:00:00      5    mix ampere01,hopper01,volta[01,04-05]
gpu-short-ksi      up    2:00:00      4   idle ampere[02-03],volta[02-03]
gpu-short-teach    up    2:00:00      5    mix ampere01,hopper01,volta[01,04-05]
gpu-short-teach    up    2:00:00      4   idle ampere[02-03],volta[02-03]
gpu-bio            up 7-00:00:00      2    mix ampere01,hopper01
gpu-bio            up 7-00:00:00      2   idle ampere[02-03]
```

```
scontrol show partition gpu-bio
```
```
PartitionName=gpu-bio
   AllowGroups=ALL AllowAccounts=ksibio AllowQos=ALL
   AllocNodes=ALL Default=NO QoS=N/A
   DefaultTime=01:00:00 DisableRootJobs=NO ExclusiveUser=NO ExclusiveTopo=NO GraceTime=0 Hidden=NO
   MaxNodes=UNLIMITED MaxTime=7-00:00:00 MinNodes=0 LLN=NO MaxCPUsPerNode=UNLIMITED MaxCPUsPerSocket=UNLIMITED
   Nodes=ampere[01-03],hopper01
   PriorityJobFactor=1 PriorityTier=800 RootOnly=NO ReqResv=NO OverSubscribe=FORCE:1
   OverTimeLimit=NONE PreemptMode=REQUEUE
   State=UP TotalCPUs=576 TotalNodes=4 SelectTypeParameters=NONE
   JobDefaults=(null)
   DefMemPerNode=UNLIMITED MaxMemPerNode=UNLIMITED
   TRES=cpu=576,mem=2534000M,node=4,billing=576,gres/gpu=9
```


### User info

To see what accounts you are member of

```
sacctmgr show user
```

```
sacctmgr show association
```

### Interactive jobs

Meant for prototyping, not for running long jobs.

```
srun --pty bash -A ksibio --gpus=1
```

# TODO 
  - GPU HelloWorld on gpulab
    - CUDA
    - PyTorch
    - TensorFlow
  - Using gpulab with Jupyter Notebook
  - Running jobs as Docker containers

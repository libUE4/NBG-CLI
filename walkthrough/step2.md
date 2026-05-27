# 深入理解代码库

**NBG 会先建立全局上下文，再按需深入关键文件。**

NBG 不会脱离项目结构直接改代码。它会理解目录、依赖和调用关系，并在修改前进行有目标的上下文探索，让执行动作更贴近你的工程约束。

![NBG 代码库理解演示](https://storage.googleapis.com/cline_public_images/docs/assets/cline-reading-codebase-hifi-2_compress.webp)

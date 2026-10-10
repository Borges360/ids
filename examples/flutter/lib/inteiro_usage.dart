// Consumo dos tokens gerados em packages/tokens/dist/flutter/inteiro.dart
// Widgets Flutter precisam de adaptação; os tokens de cor/espaço são universais.
import 'package:flutter/material.dart';

class InteiroNote extends StatelessWidget {
  const InteiroNote({super.key});
  @override
  Widget build(BuildContext context) {
    return const Text('Use InteiroColors / InteiroSpace gerados — não hex hardcoded.');
  }
}
